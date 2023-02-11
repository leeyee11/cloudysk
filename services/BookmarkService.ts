import Realm, { BSON } from 'realm';
import { BookmarkSchema } from "../schemas/Bookmark";

const { UUID } = BSON;

interface Bookmark {
  path: string,
  type: "file" | "directory"
  user: string,
  collection: "star" | "audio" | "video",
  category: "default" | string,
}
type BookmarkRecord = Bookmark & { _id: BSON.UUID };
type BookmarkPayload = Partial<Bookmark> & { id: string, user: string };

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
  const nextId = new UUID();
  realm.write(() => {
    result = realm.create<BookmarkRecord>(
      BOOKMARK, {
        _id: nextId,
        ...payload
      }
    )
  })
  if (result) {
    return convert(result);
  }
  throw new Error('Failed to mark');
}

export const update = async (payload: BookmarkPayload) => {
  const realm = await connect(BookmarkSchema)
  const target = realm.objects<BookmarkRecord>(BOOKMARK)
    .find((value) => value._id.toHexString() === payload.id && value.user === payload.user );
  if (target) {
    realm.write(() => {
      payload.type && (target.type = payload.type);
      payload.path && (target.path = payload.path);
      payload.user && (target.user = payload.user);
      payload.collection && (target.collection = payload.collection);
      payload.category && (target.category = payload.category);
    })
  }
  if (target) {
    return target;
  } else {
    throw new Error('Not found');
  }
}

export const remove = async (payload: { id: string, user: string }) => {
  const realm = await connect(BookmarkSchema)
  let target = realm.objects<BookmarkRecord>(BOOKMARK)
    .find((value) => (value._id.toHexString() === payload.id && value.user === payload.user));
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