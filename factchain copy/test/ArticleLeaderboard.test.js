const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ArticleLeaderboard", function () {
  let leaderboard, owner, voter1, voter2, voter3;

  beforeEach(async () => {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    const Leaderboard = await ethers.getContractFactory("ArticleLeaderboard");
    leaderboard = await Leaderboard.deploy();
    await leaderboard.submitArticle("Test Title", "Qm123");
  });

  it("should submit an article and fetch its details", async () => {
    const [hash, author, likes, dislikes] = await leaderboard.getArticleDetails("Test Title");
    expect(hash).to.equal("Qm123");
    expect(author).to.equal(owner.address);
  });

  it("should allow voting and calculate ratios", async () => {
    await leaderboard.connect(voter1).voteArticle("Test Title", true);
    await leaderboard.connect(voter2).voteArticle("Test Title", false);

    const board = await leaderboard.getLeaderboard();
    expect(board.length).to.equal(1);
    expect(board[0].ratio).to.equal(5000); // 50%
  });

  it("should not allow duplicate votes", async () => {
    await leaderboard.connect(voter1).voteArticle("Test Title", true);
    await expect(
      leaderboard.connect(voter1).voteArticle("Test Title", true)
    ).to.be.revertedWith("Already voted");
  });

  it("should delete an article when dislikes reach the threshold", async () => {
    await leaderboard.connect(voter1).voteArticle("Test Title", true);
    await leaderboard.connect(voter2).voteArticle("Test Title", false);
    expect((await leaderboard.getLeaderboard()).length).to.equal(1);

    await leaderboard.connect(voter3).voteArticle("Test Title", false);

    await expect(
      leaderboard.getArticleDetails("Test Title")
    ).to.be.revertedWith("Article does not exist");
  });
});


describe("ArticleLeaderboard pagination", function () {
  it("bounds reads and keeps the registry navigable after removal", async function () {
    const leaderboard = await (await ethers.getContractFactory("ArticleLeaderboard")).deploy();
    for (const name of ["First", "Second", "Third"]) await leaderboard.submitArticle(name, "Qm123");
    const [firstPage, total] = await leaderboard.getArticlePage(0, 2);
    expect(total).to.equal(3);
    expect(firstPage.map(item => item.title)).to.deep.equal(["Third", "Second"]);
    const [secondPage] = await leaderboard.getArticlePage(2, 2);
    expect(secondPage.map(item => item.title)).to.deep.equal(["First"]);
    await expect(leaderboard.getArticlePage(0, 51)).to.be.revertedWith("Invalid page size");
    await leaderboard.voteArticle("Second", false);
    const [remaining] = await leaderboard.getArticlePage(0, 2);
    expect(await leaderboard.articleCount()).to.equal(2);
    expect(remaining.map(item => item.title)).to.deep.equal(["Third", "First"]);
  });
});
