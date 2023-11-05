const { EntitySchema } = require('typeorm');
const Reply = require('../../Models/Entites/Reply');

module.exports = new EntitySchema({
  name: 'Reply',
  target: Reply,
  columns: {
    replyId: {
      primary: true,
      type: 'bigint',
      generated: 'increment',
    },
    tweetId: {
      type: 'bigint',
    },
    userId: {
      type: 'bigint',
    },
    text: {
      type: 'varchar',
    },
  },
  relations: {
    LikeReply: {
      type: 'many-to-many',
      target: 'User',
      joinTable: {
        name: 'LikeReply',
      },
      cascade: true,
    },
  },
});