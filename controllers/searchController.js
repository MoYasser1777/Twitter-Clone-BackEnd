const { AppDataSource } = require('../dataSource');
const catchAsync = require('../middlewares/catchAsync');
const AppError = require('../services/AppError');

const Tweet = require('../models/entites/Tweet');
const User = require('../models/entites/User');
const Media = require('../models/entites/Media');
const Reply = require('../models/entites/Reply');
const Like = require('../models/relations/Like');
const Repost = require('../models/relations/Repost');
const Follow = require('../models/relations/Follow');

let usersRes = [];
let tweetsRes = [];
const numResultsPerPage = 10;

async function getTweetInfo(tweetId, userId) {
  const likesCount = await AppDataSource.getRepository(Like).count({
    where: {
      tweetId: tweetId,
    },
  });
  const repostsCount = await AppDataSource.getRepository(Repost).count({
    where: {
      tweetId: tweetId,
    },
  });
  const repliesCount = await AppDataSource.getRepository(Reply).count({
    where: {
      tweetId: tweetId,
    },
  });

  let isLiked = await AppDataSource.getRepository(Like).findOne({
    where: {
      userId: userId,
      tweetId: tweetId,
    },
  });

  let isReposted = await AppDataSource.getRepository(Repost).findOne({
    where: {
      userId: userId,
      tweetId: tweetId,
    },
  });

  let isReplied = await AppDataSource.getRepository(Reply).findOne({
    where: {
      userId: userId,
      tweetId: tweetId,
    },
  });

  isLiked = !!isLiked;
  isReposted = !!isReposted;
  isReplied = !!isReplied;

  return {
    likesCount,
    repostsCount,
    repliesCount,
    isLiked,
    isReposted,
    isReplied,
  };
}

async function getUserInfo(userId, currUserId) {
  let isFollowed = await AppDataSource.getRepository(Follow).findOne({
    where: {
      userId: userId,
      followerId: currUserId,
    },
  });

  let isFollowing = await AppDataSource.getRepository(Follow).findOne({
    where: {
      userId: currUserId,
      followerId: userId,
    },
  });

  isFollowed = !!isFollowed;
  isFollowing = !!isFollowing;

  return {
    isFollowed,
    isFollowing,
  };
}

exports.searchFirstUsers = catchAsync(async (req) => {
  const { query } = req.query;
  const currUser = req.currentUser;

  if (!query) {
    return next(new AppError('No tweet exists with this id', 400));
  }

  const users = await AppDataSource.getRepository(User).find();
  const matchingUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.name.toLowerCase().includes(query.toLowerCase()),
  );

  const usersPromises = matchingUsers.map(async (user) => {
    const userInfo = await getUserInfo(user.userId, currUser.userId);
    if (user.userId != currUser.userId)
      return {
        id: user.userId,
        email: user.email,
        screenName: user.name,
        username: user.username,
        profileImageURL: user.imageUrl,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingsCount,
        isFollowed: userInfo.isFollowed,
        isFollowing: userInfo.isFollowing,
      };
  });
  const usersList = await Promise.all(usersPromises);
  if (usersList[0] != null) usersRes = usersList;
  else usersRes = [];
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const { pageNum } = req.params;
  if (parseInt(pageNum, 10) === 1) {
    await this.searchFirstUsers(req);
  }

  const users = usersRes.slice(
    (pageNum - 1) * numResultsPerPage,
    pageNum * numResultsPerPage,
  );
  res.status(200).json({
    status: true,
    data: users,
    total: usersRes.length,
  });
});

exports.searchFirstTweets = catchAsync(async (req) => {
  const { query } = req.query;
  const currUserId = req.currentUser.userId;

  if (!query) {
    return next(new AppError('No tweet exists with this id', 400));
  }

  const tweets = await AppDataSource.getRepository(Tweet)
    .createQueryBuilder('tweet')
    .innerJoinAndMapOne(
      'tweet.user',
      User,
      'user',
      'user.userId = tweet.userId',
    )
    .getMany();

  const matchingTweets = tweets.filter((tweet) =>
    tweet.text.toLowerCase().includes(query.toLowerCase()),
  );

  const tweetsPromises = matchingTweets.map(async (tweet) => {
    const tweetInfo = await getTweetInfo(tweet.tweetId, currUserId);
    const tweeterInfo = await getUserInfo(tweet.userId, currUserId);
    const tweetMedia = await AppDataSource.getRepository(Media).find({
      where: {
        tweetId: tweet.tweetId,
      },
    });
    const tweetMediaUrls = tweetMedia.map((media) => media.url);
    return {
      id: tweet.tweetId,
      text: tweet.text,
      createdAt: tweet.time,
      user: {
        userId: tweet.user.userId,
        profileImageURL: tweet.user.imageUrl,
        screenName: tweet.user.name,
        username: tweet.user.username,
        bio: tweet.user.bio,
        followersCount: tweet.user.followersCount,
        followingCount: tweet.user.followingsCount,
        isFollowed: tweeterInfo.isFollowed,
        isFollowing: tweeterInfo.isFollowing,
      },
      attachmentsURL: tweetMediaUrls,
      isRetweet: false,
      isLiked: tweetInfo.isLiked,
      isRetweeted: tweetInfo.isReposted,
      isReplied: tweetInfo.isReplied,
      likesCount: tweetInfo.likesCount,
      retweetsCount: tweetInfo.repostsCount,
      repliesCount: tweetInfo.repliesCount,
      retweetedUser: {},
    };
  });
  let tweetsList = await Promise.all(tweetsPromises);
  if (tweetsList[0] != null) tweetsRes = tweetsList;
  else tweetsRes = [];
});

exports.searchTweets = catchAsync(async (req, res, next) => {
  const { pageNum } = req.params;
  if (parseInt(pageNum, 10) === 1) {
    await this.searchFirstTweets(req);
  }

  const tweets = tweetsRes.slice(
    (pageNum - 1) * numResultsPerPage,
    pageNum * numResultsPerPage,
  );
  res.status(200).json({
    status: true,
    data: tweets,
    total: tweetsRes.length,
  });
});
