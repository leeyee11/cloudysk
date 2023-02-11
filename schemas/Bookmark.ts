export const BookmarkSchema = {
  name: "Bookmark",
  properties: {
    _id: "uuid",
    path: "string",
    type: "string",
    user: "string",
    collection: "string", // star, music, video
    category: "string", // default or others
  },
  primaryKey: "_id",
};