import Realm, { BSON } from 'realm';
import { BookmarkSchema } from "../schemas/Bookmark";

const { UUID } = BSON;

type BookmarkFileType = "file" | "directory";
type BookmarkCollection = "star" | "audio" | "video";

interface Bookmark {
  path: string,
  type: BookmarkFileType,
  user: string,
  collection: BookmarkCollection,
  category: "default" | string, // custom category is only for audio
}
type BookmarkRecord = Bookmark & { _id: BSON.UUID };

const BOOKMARK = "Bookmark"

const closure = () => {
  let realm: ReturnType<typeof Realm.open>;
  return (Schema: any) => {
    if (!realm) {
      realm = Realm.open({
        path: "db/realm",
        schema: [Schema],
      });
    }
    return realm;
  }
}

export const connect = closure();

const convert = (value: BookmarkRecord) => ({ 
    id: value._id.toHexString(),
    type: value.type,
    path: value.path,
    user: value.user,
    collection: value.collection,
    category: value.category
});


export const create = async (payload: Bookmark) => {
  const realm = await connect(BookmarkSchema);
  const isExist = realm.objects<BookmarkRecord>(BOOKMARK)
    .find(value=> (
      payload.user === value.user &&
      payload.path === value.path && 
      payload.category === value.category && 
      payload.collection === value.collection
    ));
  if (isExist) {
    throw new Error('Alreay exists');
  }
  let result;
  realm.write(() => {
    result = realm.create<BookmarkRecord>(
      BOOKMARK, {
        _id: new UUID(),
        ...payload
      }
    )
  })
  if (result) {
    return convert(result);
  }
  throw new Error('Failed to mark');
}

export const update = async (payload: { type: BookmarkFileType, collection: BookmarkCollection, path: string, categories: string[], user: string }) => {
  const realm = await connect(BookmarkSchema)
  const targets = realm.objects<BookmarkRecord>(BOOKMARK)
    .filter((value) => value.path === payload.path && value.user === payload.user );
    realm.write(() => {
      if (targets.length) {
        realm.delete(targets);
      }
      for (const category of payload.categories) {
        realm.create<BookmarkRecord>(
          BOOKMARK, {
            _id: new UUID(),
            path: payload.path,
            type: payload.type,
            user: payload.user,
            category: category,
            collection: payload.collection
          }
        );
      }
  })
}

export const remove = async (payload: { path: string, collection: string, category: string, user: string }) => {
  const realm = await connect(BookmarkSchema)
  let target = realm.objects<BookmarkRecord>(BOOKMARK)
    .find((value) => (
      value.path === payload.path &&
      value.collection === payload.collection &&
      value.category === payload.category &&
      value.user === payload.user
    ));
  if (!target) {
    throw new Error('Not found');
  }
  if (target) {
    realm.write(() => {
      realm.delete(target);
      target = undefined;
    })
  }
}

export const getMarkers = async (payload: { path: string, user: string }) => {
  const realm = await connect(BookmarkSchema)
  const results = realm.objects<BookmarkRecord>(BOOKMARK)
    .filter(value => value.path === payload.path && value.user === payload.user)
    .map(convert)
  return results;
}

export const getCollection = async (payload: { collection: string, user: string }) => {
  const realm = await connect(BookmarkSchema)
  const results = realm.objects<BookmarkRecord>(BOOKMARK)
    .filter(value => value.collection === payload.collection && value.user === payload.user)
    .map(convert)
  return results;
}

export const getCategories = async (payload: { user: string }) => {
  const realm = await connect(BookmarkSchema)
  const results = realm.objects<BookmarkRecord>(BOOKMARK)
    .filter(value => value.collection === 'audio' && value.user === payload.user)
    .map(value => value.category);
  return [...new Set(['default', ...results])];
}

export const removePath = async (payload: { path: string, user: string }) => {
  const realm = await connect(BookmarkSchema)
  let targets = realm.objects<BookmarkRecord>(BOOKMARK)
    .filter((value) => (value.path === payload.path && value.user === payload.user));
  if (targets?.length) {
    realm.write(() => {
        realm.delete(targets);
    })
    targets = undefined as any;
  }
}

export const renamePath = async (payload: { source: string, target: string, user: string }) => {
  const realm = await connect(BookmarkSchema)
  let targets = realm.objects<BookmarkRecord>(BOOKMARK)
    .filter((value) => (value.path === payload.source && value.user === payload.user));
  if (targets?.length) {
    realm.write(() => {
      for (const target of targets) {
        target.path = payload.target;
      }
    })
  }
}

export const query = async (criteria: string) => {
  const realm = await connect(BookmarkSchema)
  const results = realm.objects<BookmarkRecord>(BOOKMARK)
    .filtered(criteria)
    .map(convert);
  return results;
}