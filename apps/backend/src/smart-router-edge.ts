import { StackAssertionError } from "@opendex/stack-shared/dist/utils/errors";

export const SmartRouterEdge = {
  matchNormalizedPath: (path: string, normalizedPath: string) => matchPath(path, normalizedPath),
};

function matchPath(path: string, toMatchWith: string): Record<string, string | string[]> | false {
  // get the relative part, and modify it to have a leading slash, without a trailing slash, without ./.., etc.
  const url = new URL(path + "/", "http://example.com");
  const modifiedPath = url.pathname.slice(1, -1);
  const modifiedToMatchWith = toMatchWith.slice(1);

  if (modifiedPath === "" && modifiedToMatchWith === "") {
    return {};
  }

  const pathFirst = modifiedPath.split("/")[0];
  const toMatchWithFirst = modifiedToMatchWith.split("/")[0];
  const recurse = () => matchPath(modifiedPath.slice((modifiedPath + "/").indexOf("/")), modifiedToMatchWith.slice((modifiedToMatchWith + "/").indexOf("/")));

  if (toMatchWithFirst.startsWith("[[...") && toMatchWithFirst.endsWith("]]")) {
    if (modifiedToMatchWith.includes("/")) {
      throw new StackAssertionError("Optional catch-all routes must be at the end of the path", { modifiedPath, modifiedToMatchWith });
    }
    return {
      [toMatchWithFirst.slice(5, -2)]: modifiedPath === "" ? [] : modifiedPath.split("/"),
    };
  } else if (toMatchWithFirst.startsWith("[...") && toMatchWithFirst.endsWith("]")) {
    if (modifiedToMatchWith.includes("/")) {
      throw new StackAssertionError("Catch-all routes must be at the end of the path", { modifiedPath, modifiedToMatchWith });
    }
    if (modifiedPath === "") return false;
    return {
      [toMatchWithFirst.slice(4, -1)]: modifiedPath.split("/"),
    };
  } else if (toMatchWithFirst.startsWith("[") && toMatchWithFirst.endsWith("]")) {
    if (modifiedPath === "") return false;
    const recurseResult = recurse();
    if (!recurseResult) return false;
    return {
      [toMatchWithFirst.slice(1, -1)]: pathFirst,
      ...recurseResult,
    };
  } else if (toMatchWithFirst === pathFirst) {
    return recurse();
  } else {
    return false;
  }
}

