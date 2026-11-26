// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ArticleLeaderboard.sol";

contract StakedArticleLeaderboard is ArticleLeaderboard {
    uint256 public constant STAKE = 0.02 ether;
    uint256 public constant REVIEW_PERIOD = 7 days;
    uint256 public constant WINDOW = 7 days;
    uint256 public constant MIN_VOTES = 5;

    struct Review { uint64 deadline; bool settled; }
    struct Score { uint128 up; uint128 down; }
    struct Rewards { uint256 cursor; address[3] top; bool paid; }

    mapping(bytes32 => Review) public reviews;
    mapping(address => uint256) public credits;
    mapping(uint256 => uint256) public rewardPool;
    mapping(uint256 => mapping(address => Score)) public weeklyScore;
    mapping(uint256 => address[]) private participants;
    mapping(uint256 => Rewards) public rewards;

    event StakeSettled(bytes32 indexed titleHash, address indexed author, bool forfeited, uint256 week);
    event WeeklyRewardsPaid(uint256 indexed week, address[3] winners, uint256 amount);

    constructor() {
        require(block.chainid == 31337 || block.chainid == 11155111, "Use Hardhat or Sepolia");
    }

    function currentWeek() public view returns (uint256) {
        return block.timestamp / WINDOW;
    }

    function submitArticle(string memory title, string memory cid) public payable override {
        require(msg.value == STAKE, "Stake must be 0.02 test ETH");
        bytes32 id = keccak256(bytes(title));
        require(reviews[id].deadline == 0, "Fact title already used");
        _registerArticle(title, cid);
        reviews[id] = Review(uint64(block.timestamp + REVIEW_PERIOD), false);
    }

    function voteArticle(string memory title, bool liked) public override {
        bytes32 id = keccak256(bytes(title));
        Review storage review = reviews[id];
        require(review.deadline > block.timestamp, "Review window closed");
        require(articles[id].author != msg.sender, "Cannot vote on your own fact");
        super.voteArticle(title, liked);
    }

    function _afterVote(bytes32 id, bool liked) internal override {
        uint256 week = currentWeek();
        address author = articles[id].author;
        Score storage score = weeklyScore[week][author];
        if (score.up == 0 && score.down == 0) participants[week].push(author);
        if (liked) score.up++;
        else score.down++;
    }

    function settleArticle(string calldata title) external {
        bytes32 id = keccak256(bytes(title));
        Review storage review = reviews[id];
        require(review.deadline != 0 && block.timestamp >= review.deadline, "Review still open or unknown");
        require(!review.settled, "Stake already settled");
        review.settled = true;

        Article storage article = articles[id];
        address author = article.author;
        uint256 total = article.likes + article.dislikes;
        bool forfeited = total >= MIN_VOTES && article.dislikes * 3 >= total * 2;
        uint256 week = currentWeek();
        if (forfeited) {
            rewardPool[week] += STAKE;
            _removeArticle(id);
        } else {
            credits[author] += STAKE;
        }
        emit StakeSettled(id, author, forfeited, week);
    }

    function finalizeWeek(uint256 week, uint256 limit) external {
        require(week < currentWeek(), "Week has not ended");
        require(limit > 0 && limit <= 50, "Invalid batch size");
        Rewards storage result = rewards[week];
        require(!result.paid, "Week already paid");
        address[] storage authors = participants[week];
        uint256 end = result.cursor + limit;
        if (end > authors.length) end = authors.length;

        for (uint256 i = result.cursor; i < end; i++) {
            address candidate = authors[i];
            Score memory score = weeklyScore[week][candidate];
            if (score.up < 3 || score.up <= score.down) continue;
            for (uint256 rank = 0; rank < 3; rank++) {
                if (_ranksAbove(week, candidate, result.top[rank])) {
                    for (uint256 j = 2; j > rank; j--) result.top[j] = result.top[j - 1];
                    result.top[rank] = candidate;
                    break;
                }
            }
        }
        result.cursor = end;
        if (end == authors.length) _creditRewards(week, result);
    }

    function _ranksAbove(uint256 week, address candidate, address incumbent) private view returns (bool) {
        if (incumbent == address(0)) return true;
        Score memory a = weeklyScore[week][candidate];
        Score memory b = weeklyScore[week][incumbent];
        uint256 left = uint256(a.up) * (uint256(b.up) + b.down);
        uint256 right = uint256(b.up) * (uint256(a.up) + a.down);
        if (left != right) return left > right;
        if (a.up != b.up) return a.up > b.up;
        return candidate < incumbent;
    }

    function _creditRewards(uint256 week, Rewards storage result) private {
        result.paid = true;
        uint256 amount = rewardPool[week];
        rewardPool[week] = 0;
        if (result.top[0] == address(0)) {
            rewardPool[currentWeek()] += amount;
        } else {
            uint256 second = result.top[1] == address(0) ? 0 : amount * 30 / 100;
            uint256 third = result.top[2] == address(0) ? 0 : amount * 20 / 100;
            credits[result.top[0]] += amount - second - third;
            if (second > 0) credits[result.top[1]] += second;
            if (third > 0) credits[result.top[2]] += third;
        }
        emit WeeklyRewardsPaid(week, result.top, amount);
    }

    function weekProgress(uint256 week) external view returns (uint256 processed, uint256 total, address[3] memory winners, bool paid) {
        Rewards storage result = rewards[week];
        return (result.cursor, participants[week].length, result.top, result.paid);
    }

    function withdraw() external {
        uint256 amount = credits[msg.sender];
        require(amount > 0, "No withdrawable test ETH");
        credits[msg.sender] = 0;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }
}

