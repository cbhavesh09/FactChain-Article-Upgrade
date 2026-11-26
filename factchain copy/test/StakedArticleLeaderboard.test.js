const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakedArticleLeaderboard", function () {
  let registry, author, voters;
  const stake = ethers.parseEther("0.02");

  beforeEach(async () => {
    [author, ...voters] = await ethers.getSigners();
    registry = await (await ethers.getContractFactory("StakedArticleLeaderboard")).deploy();
  });

  it("requires the exact stake, rejects self-votes, and refunds a low-quorum post", async () => {
    await expect(registry.submitArticle("Test", "cid")).to.be.revertedWith("Stake must be 0.02 test ETH");
    await registry.submitArticle("Test", "cid", { value: stake });
    await expect(registry.voteArticle("Test", true)).to.be.revertedWith("Cannot vote on your own fact");
    await registry.connect(voters[0]).voteArticle("Test", false);
    await expect(registry.connect(voters[0]).voteArticle("Test", false)).to.be.revertedWith("Already voted");
    await expect(registry.settleArticle("Test")).to.be.revertedWith("Review still open or unknown");
    await time.increase(7 * 86400);
    await registry.settleArticle("Test");
    expect(await registry.credits(author.address)).to.equal(stake);
    await expect(registry.withdraw()).to.changeEtherBalance(author, stake);
    await expect(registry.settleArticle("Test")).to.be.revertedWith("Stake already settled");
  });

  it("slashes at quorum and distributes credits to the three highest weekly ratios in batches", async () => {
    await registry.submitArticle("Flagged", "cid", { value: stake });
    for (let i = 0; i < 5; i++) await registry.connect(voters[i]).voteArticle("Flagged", i >= 4);
    await time.increase(7 * 86400);
    await registry.settleArticle("Flagged");
    const week = await registry.currentWeek();
    expect(await registry.rewardPool(week)).to.equal(stake);
    expect(await registry.articleCount()).to.equal(0);
    expect(await registry.credits(author.address)).to.equal(0);
    const candidates = voters.slice(7, 11);
    const profiles = [[5, 0], [4, 1], [3, 1], [3, 2]];
    for (let i = 0; i < profiles.length; i++) {
      const title = "Rated " + i;
      await registry.connect(candidates[i]).submitArticle(title, "cid", { value: stake });
      const [up, down] = profiles[i];
      for (let j = 0; j < up + down; j++) await registry.connect(voters[j]).voteArticle(title, j < up);
    }
    await expect(registry.finalizeWeek(week, 1)).to.be.revertedWith("Week has not ended");
    await time.increase(7 * 86400);
    await registry.finalizeWeek(week, 2);
    expect((await registry.weekProgress(week)).paid).to.equal(false);
    await registry.finalizeWeek(week, 2);
    const progress = await registry.weekProgress(week);
    expect(progress.winners).to.deep.equal(candidates.slice(0, 3).map(account => account.address));
    for (const [index, percentage] of [50n, 30n, 20n].entries()) {
      expect(await registry.credits(candidates[index].address)).to.equal(stake * percentage / 100n);
    }
    await expect(registry.finalizeWeek(week, 2)).to.be.revertedWith("Week already paid");
  });
});

