// ../../configs/tsup/js-library.ts
import fs2 from "fs";
import path2 from "path";
import { defineConfig } from "tsup";

// ../../configs/tsup/plugins.ts
import fs from "fs";
import path from "path";
var createBasePlugin = (options) => {
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  return {
    name: "stackframe tsup plugin (private)",
    setup(build) {
      build.onEnd((result) => {
        const sourceFiles = result.outputFiles?.filter((file) => !file.path.endsWith(".map")) ?? [];
        for (const file of sourceFiles) {
          let newText = file.text;
          const matchUseClient = /[\s\n\r]*(^|\n|\r|;)\s*['"]use\s+client['"]\s*(\n|\r|;)/im;
          if (matchUseClient.test(file.text)) {
            newText = `"use client";
${file.text}`;
          }
          file.contents = new TextEncoder().encode(newText);
        }
      });
      build.onLoad({ filter: /\.(jsx?|tsx?)$/ }, async (args) => {
        let contents = await fs.promises.readFile(args.path, "utf8");
        contents = contents.replace(/STACK_COMPILE_TIME_CLIENT_PACKAGE_VERSION_SENTINEL/g, `js ${packageJson.name}@${packageJson.version}`);
        contents = contents.replace(/import\.meta\.vitest/g, "undefined");
        return {
          contents,
          loader: path.extname(args.path).slice(1)
        };
      });
    }
  };
};

// ../../configs/tsup/js-library.ts
var customNoExternal = /* @__PURE__ */ new Set([
  "oauth4webapi"
]);
var fixImportExtensions = (extension = ".js") => ({
  name: "fix-import-extensions",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.importer) {
        const filePath = path2.join(args.resolveDir, args.path);
        let resolvedPath;
        if (fs2.existsSync(filePath + ".ts") || fs2.existsSync(filePath + ".tsx")) {
          resolvedPath = args.path + extension;
        } else if (fs2.existsSync(path2.join(filePath, `index.ts`)) || fs2.existsSync(path2.join(filePath, `index.tsx`))) {
          resolvedPath = args.path.endsWith("/") ? args.path + "index" + extension : args.path + "/index" + extension;
        }
        return { path: resolvedPath ?? args.path, external: true };
      }
    });
  }
});
function createJsLibraryTsupConfig(options) {
  return defineConfig({
    entryPoints: ["src/**/*.(ts|tsx|js|jsx)"],
    sourcemap: true,
    clean: false,
    noExternal: [...customNoExternal],
    dts: options.barrelFile ? "src/index.ts" : true,
    // we only generate types for the barrel file because it drastically decreases the memory needed for tsup https://github.com/egoist/tsup/issues/920#issuecomment-2454732254
    outDir: "dist",
    format: ["esm", "cjs"],
    legacyOutput: true,
    esbuildPlugins: [
      fixImportExtensions(),
      createBasePlugin({}),
      {
        name: "stackframe: force most files to be external",
        setup(build) {
          build.onResolve({ filter: /^.*$/m }, async (args) => {
            if (args.kind === "entry-point" || customNoExternal.has(args.path)) {
              return void 0;
            }
            return {
              external: true
            };
          });
        }
      }
    ]
  });
}

// tsup.config.ts
var tsup_config_default = createJsLibraryTsupConfig({ barrelFile: true });
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vY29uZmlncy90c3VwL2pzLWxpYnJhcnkudHMiLCAiLi4vLi4vY29uZmlncy90c3VwL3BsdWdpbnMudHMiLCAidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL2hvbWUvYWd1em1hbi9Qcm95ZWN0b3MtMjAyNi9JZGVudGl0eS1QbGF0Zm9ybS9jb25maWdzL3RzdXAvanMtbGlicmFyeS50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCIvaG9tZS9hZ3V6bWFuL1Byb3llY3Rvcy0yMDI2L0lkZW50aXR5LVBsYXRmb3JtL2NvbmZpZ3MvdHN1cFwiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vaG9tZS9hZ3V6bWFuL1Byb3llY3Rvcy0yMDI2L0lkZW50aXR5LVBsYXRmb3JtL2NvbmZpZ3MvdHN1cC9qcy1saWJyYXJ5LnRzXCI7aW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndHN1cCc7XG5pbXBvcnQgeyBjcmVhdGVCYXNlUGx1Z2luIH0gZnJvbSAnLi9wbHVnaW5zJztcblxuXG5jb25zdCBjdXN0b21Ob0V4dGVybmFsID0gbmV3IFNldChbXG4gIFwib2F1dGg0d2ViYXBpXCIsXG5dKTtcblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Vnb2lzdC90c3VwL2lzc3Vlcy85NTNcbmNvbnN0IGZpeEltcG9ydEV4dGVuc2lvbnMgPSAoZXh0ZW5zaW9uOiBzdHJpbmcgPSBcIi5qc1wiKSAgPT4gKHtcbiAgbmFtZTogXCJmaXgtaW1wb3J0LWV4dGVuc2lvbnNcIixcbiAgc2V0dXAoYnVpbGQpIHtcbiAgICBidWlsZC5vblJlc29sdmUoeyBmaWx0ZXI6IC8uKi8gfSwgKGFyZ3MpID0+IHtcbiAgICAgIGlmIChhcmdzLmltcG9ydGVyKSB7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKGFyZ3MucmVzb2x2ZURpciwgYXJncy5wYXRoKTtcbiAgICAgICAgbGV0IHJlc29sdmVkUGF0aDtcblxuICAgICAgICBcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZVBhdGggKyBcIi50c1wiKSB8fCBmcy5leGlzdHNTeW5jKGZpbGVQYXRoICsgXCIudHN4XCIpKSB7XG4gICAgICAgICAgcmVzb2x2ZWRQYXRoID0gYXJncy5wYXRoICsgZXh0ZW5zaW9uO1xuICAgICAgICB9IGVsc2UgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGZpbGVQYXRoLCBgaW5kZXgudHNgKSkgfHwgZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oZmlsZVBhdGgsIGBpbmRleC50c3hgKSkpIHtcbiAgICAgICAgICByZXNvbHZlZFBhdGggPSBhcmdzLnBhdGguZW5kc1dpdGgoXCIvXCIpID8gYXJncy5wYXRoICsgXCJpbmRleFwiICsgZXh0ZW5zaW9uIDogYXJncy5wYXRoICsgXCIvaW5kZXhcIiArIGV4dGVuc2lvbjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBwYXRoOiByZXNvbHZlZFBhdGggPz8gYXJncy5wYXRoLCBleHRlcm5hbDogdHJ1ZSB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxufSk7XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlSnNMaWJyYXJ5VHN1cENvbmZpZyhvcHRpb25zOiB7IGJhcnJlbEZpbGU6IGJvb2xlYW4gfSkge1xuICByZXR1cm4gZGVmaW5lQ29uZmlnKHtcbiAgICBlbnRyeVBvaW50czogWydzcmMvKiovKi4odHN8dHN4fGpzfGpzeCknXSxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgY2xlYW46IGZhbHNlLFxuICAgIG5vRXh0ZXJuYWw6IFsuLi5jdXN0b21Ob0V4dGVybmFsXSxcbiAgICBkdHM6IG9wdGlvbnMuYmFycmVsRmlsZSA/ICdzcmMvaW5kZXgudHMnIDogdHJ1ZSwgIC8vIHdlIG9ubHkgZ2VuZXJhdGUgdHlwZXMgZm9yIHRoZSBiYXJyZWwgZmlsZSBiZWNhdXNlIGl0IGRyYXN0aWNhbGx5IGRlY3JlYXNlcyB0aGUgbWVtb3J5IG5lZWRlZCBmb3IgdHN1cCBodHRwczovL2dpdGh1Yi5jb20vZWdvaXN0L3RzdXAvaXNzdWVzLzkyMCNpc3N1ZWNvbW1lbnQtMjQ1NDczMjI1NFxuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGZvcm1hdDogWydlc20nLCAnY2pzJ10sXG4gICAgbGVnYWN5T3V0cHV0OiB0cnVlLFxuICAgIGVzYnVpbGRQbHVnaW5zOiBbXG4gICAgICBmaXhJbXBvcnRFeHRlbnNpb25zKCksXG4gICAgICBjcmVhdGVCYXNlUGx1Z2luKHt9KSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ3N0YWNrZnJhbWU6IGZvcmNlIG1vc3QgZmlsZXMgdG8gYmUgZXh0ZXJuYWwnLFxuICAgICAgICBzZXR1cChidWlsZCkge1xuICAgICAgICAgIGJ1aWxkLm9uUmVzb2x2ZSh7IGZpbHRlcjogL14uKiQvbSB9LCBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgaWYgKGFyZ3Mua2luZCA9PT0gXCJlbnRyeS1wb2ludFwiIHx8IGN1c3RvbU5vRXh0ZXJuYWwuaGFzKGFyZ3MucGF0aCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGV4dGVybmFsOiB0cnVlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBdLFxuICB9KTtcbn1cbiIsICJjb25zdCBfX2luamVjdGVkX2ZpbGVuYW1lX18gPSBcIi9ob21lL2FndXptYW4vUHJveWVjdG9zLTIwMjYvSWRlbnRpdHktUGxhdGZvcm0vY29uZmlncy90c3VwL3BsdWdpbnMudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiL2hvbWUvYWd1em1hbi9Qcm95ZWN0b3MtMjAyNi9JZGVudGl0eS1QbGF0Zm9ybS9jb25maWdzL3RzdXBcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL2hvbWUvYWd1em1hbi9Qcm95ZWN0b3MtMjAyNi9JZGVudGl0eS1QbGF0Zm9ybS9jb25maWdzL3RzdXAvcGx1Z2lucy50c1wiO2ltcG9ydCB0eXBlIHsgUGx1Z2luLCBQbHVnaW5CdWlsZCwgQnVpbGRSZXN1bHQsIE9uTG9hZEFyZ3MgfSBmcm9tIFwiZXNidWlsZFwiO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVCYXNlUGx1Z2luID0gKG9wdGlvbnM6IHt9KTogUGx1Z2luID0+IHtcbiAgY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhcIi4vcGFja2FnZS5qc29uXCIsIFwidXRmLThcIikpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdzdGFja2ZyYW1lIHRzdXAgcGx1Z2luIChwcml2YXRlKScsXG4gICAgc2V0dXAoYnVpbGQ6IFBsdWdpbkJ1aWxkKSB7XG4gICAgICBidWlsZC5vbkVuZCgocmVzdWx0OiBCdWlsZFJlc3VsdCkgPT4ge1xuICAgICAgICBjb25zdCBzb3VyY2VGaWxlcyA9IHJlc3VsdC5vdXRwdXRGaWxlcz8uZmlsdGVyKChmaWxlOiBhbnkpID0+ICFmaWxlLnBhdGguZW5kc1dpdGgoJy5tYXAnKSkgPz8gW107XG4gICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBzb3VyY2VGaWxlcykge1xuICAgICAgICAgIGxldCBuZXdUZXh0ID0gZmlsZS50ZXh0O1xuXG4gICAgICAgICAgLy8gbWFrZSBzdXJlIFwidXNlIGNsaWVudFwiIGlzIGF0IHRoZSB0b3Agb2YgdGhlIGZpbGVcbiAgICAgICAgICBjb25zdCBtYXRjaFVzZUNsaWVudCA9IC9bXFxzXFxuXFxyXSooXnxcXG58XFxyfDspXFxzKlsnXCJddXNlXFxzK2NsaWVudFsnXCJdXFxzKihcXG58XFxyfDspL2ltO1xuICAgICAgICAgIGlmIChtYXRjaFVzZUNsaWVudC50ZXN0KGZpbGUudGV4dCkpIHtcbiAgICAgICAgICAgIG5ld1RleHQgPSBgXCJ1c2UgY2xpZW50XCI7XFxuJHtmaWxlLnRleHR9YDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBmaWxlLmNvbnRlbnRzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKG5ld1RleHQpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgYnVpbGQub25Mb2FkKHsgZmlsdGVyOiAvXFwuKGpzeD98dHN4PykkLyB9LCBhc3luYyAoYXJnczogT25Mb2FkQXJncykgPT4ge1xuICAgICAgICBsZXQgY29udGVudHMgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShhcmdzLnBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNvbnRlbnRzID0gY29udGVudHMucmVwbGFjZSgvU1RBQ0tfQ09NUElMRV9USU1FX0NMSUVOVF9QQUNLQUdFX1ZFUlNJT05fU0VOVElORUwvZywgYGpzICR7cGFja2FnZUpzb24ubmFtZX1AJHtwYWNrYWdlSnNvbi52ZXJzaW9ufWApO1xuICAgICAgICBjb250ZW50cyA9IGNvbnRlbnRzLnJlcGxhY2UoL2ltcG9ydFxcLm1ldGFcXC52aXRlc3QvZywgJ3VuZGVmaW5lZCcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvbnRlbnRzLFxuICAgICAgICAgIGxvYWRlcjogcGF0aC5leHRuYW1lKGFyZ3MucGF0aCkuc2xpY2UoMSkgYXMgJ2pzJyB8ICdqc3gnIHwgJ3RzJyB8ICd0c3gnXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9LFxuICB9XG59XG4iLCAiY29uc3QgX19pbmplY3RlZF9maWxlbmFtZV9fID0gXCIvaG9tZS9hZ3V6bWFuL1Byb3llY3Rvcy0yMDI2L0lkZW50aXR5LVBsYXRmb3JtL3BhY2thZ2VzL3RlbXBsYXRlL3RzdXAuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIi9ob21lL2FndXptYW4vUHJveWVjdG9zLTIwMjYvSWRlbnRpdHktUGxhdGZvcm0vcGFja2FnZXMvdGVtcGxhdGVcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL2hvbWUvYWd1em1hbi9Qcm95ZWN0b3MtMjAyNi9JZGVudGl0eS1QbGF0Zm9ybS9wYWNrYWdlcy90ZW1wbGF0ZS90c3VwLmNvbmZpZy50c1wiO2ltcG9ydCBjcmVhdGVKc0xpYnJhcnlUc3VwQ29uZmlnIGZyb20gJy4uLy4uL2NvbmZpZ3MvdHN1cC9qcy1saWJyYXJ5JztcblxuZXhwb3J0IGRlZmF1bHQgY3JlYXRlSnNMaWJyYXJ5VHN1cENvbmZpZyh7IGJhcnJlbEZpbGU6IHRydWUgfSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZULE9BQU9BLFNBQVE7QUFDNVUsT0FBT0MsV0FBVTtBQUNqQixTQUFTLG9CQUFvQjs7O0FDRDdCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUVWLElBQU0sbUJBQW1CLENBQUMsWUFBd0I7QUFDdkQsUUFBTSxjQUFjLEtBQUssTUFBTSxHQUFHLGFBQWEsa0JBQWtCLE9BQU8sQ0FBQztBQUN6RSxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixNQUFNLE9BQW9CO0FBQ3hCLFlBQU0sTUFBTSxDQUFDLFdBQXdCO0FBQ25DLGNBQU0sY0FBYyxPQUFPLGFBQWEsT0FBTyxDQUFDLFNBQWMsQ0FBQyxLQUFLLEtBQUssU0FBUyxNQUFNLENBQUMsS0FBSyxDQUFDO0FBQy9GLG1CQUFXLFFBQVEsYUFBYTtBQUM5QixjQUFJLFVBQVUsS0FBSztBQUduQixnQkFBTSxpQkFBaUI7QUFDdkIsY0FBSSxlQUFlLEtBQUssS0FBSyxJQUFJLEdBQUc7QUFDbEMsc0JBQVU7QUFBQSxFQUFrQixLQUFLLElBQUk7QUFBQSxVQUN2QztBQUVBLGVBQUssV0FBVyxJQUFJLFlBQVksRUFBRSxPQUFPLE9BQU87QUFBQSxRQUNsRDtBQUFBLE1BQ0YsQ0FBQztBQUVELFlBQU0sT0FBTyxFQUFFLFFBQVEsaUJBQWlCLEdBQUcsT0FBTyxTQUFxQjtBQUNyRSxZQUFJLFdBQVcsTUFBTSxHQUFHLFNBQVMsU0FBUyxLQUFLLE1BQU0sTUFBTTtBQUMzRCxtQkFBVyxTQUFTLFFBQVEsdURBQXVELE1BQU0sWUFBWSxJQUFJLElBQUksWUFBWSxPQUFPLEVBQUU7QUFDbEksbUJBQVcsU0FBUyxRQUFRLHlCQUF5QixXQUFXO0FBQ2hFLGVBQU87QUFBQSxVQUNMO0FBQUEsVUFDQSxRQUFRLEtBQUssUUFBUSxLQUFLLElBQUksRUFBRSxNQUFNLENBQUM7QUFBQSxRQUN6QztBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQ0Y7OztBRDdCQSxJQUFNLG1CQUFtQixvQkFBSSxJQUFJO0FBQUEsRUFDL0I7QUFDRixDQUFDO0FBR0QsSUFBTSxzQkFBc0IsQ0FBQyxZQUFvQixXQUFZO0FBQUEsRUFDM0QsTUFBTTtBQUFBLEVBQ04sTUFBTSxPQUFPO0FBQ1gsVUFBTSxVQUFVLEVBQUUsUUFBUSxLQUFLLEdBQUcsQ0FBQyxTQUFTO0FBQzFDLFVBQUksS0FBSyxVQUFVO0FBQ2pCLGNBQU0sV0FBV0MsTUFBSyxLQUFLLEtBQUssWUFBWSxLQUFLLElBQUk7QUFDckQsWUFBSTtBQUdKLFlBQUlDLElBQUcsV0FBVyxXQUFXLEtBQUssS0FBS0EsSUFBRyxXQUFXLFdBQVcsTUFBTSxHQUFHO0FBQ3ZFLHlCQUFlLEtBQUssT0FBTztBQUFBLFFBQzdCLFdBQVdBLElBQUcsV0FBV0QsTUFBSyxLQUFLLFVBQVUsVUFBVSxDQUFDLEtBQUtDLElBQUcsV0FBV0QsTUFBSyxLQUFLLFVBQVUsV0FBVyxDQUFDLEdBQUc7QUFDNUcseUJBQWUsS0FBSyxLQUFLLFNBQVMsR0FBRyxJQUFJLEtBQUssT0FBTyxVQUFVLFlBQVksS0FBSyxPQUFPLFdBQVc7QUFBQSxRQUNwRztBQUNBLGVBQU8sRUFBRSxNQUFNLGdCQUFnQixLQUFLLE1BQU0sVUFBVSxLQUFLO0FBQUEsTUFDM0Q7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQ0Y7QUFHZSxTQUFSLDBCQUEyQyxTQUFrQztBQUNsRixTQUFPLGFBQWE7QUFBQSxJQUNsQixhQUFhLENBQUMsMEJBQTBCO0FBQUEsSUFDeEMsV0FBVztBQUFBLElBQ1gsT0FBTztBQUFBLElBQ1AsWUFBWSxDQUFDLEdBQUcsZ0JBQWdCO0FBQUEsSUFDaEMsS0FBSyxRQUFRLGFBQWEsaUJBQWlCO0FBQUE7QUFBQSxJQUMzQyxRQUFRO0FBQUEsSUFDUixRQUFRLENBQUMsT0FBTyxLQUFLO0FBQUEsSUFDckIsY0FBYztBQUFBLElBQ2QsZ0JBQWdCO0FBQUEsTUFDZCxvQkFBb0I7QUFBQSxNQUNwQixpQkFBaUIsQ0FBQyxDQUFDO0FBQUEsTUFDbkI7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLE1BQU0sT0FBTztBQUNYLGdCQUFNLFVBQVUsRUFBRSxRQUFRLFFBQVEsR0FBRyxPQUFPLFNBQVM7QUFDbkQsZ0JBQUksS0FBSyxTQUFTLGlCQUFpQixpQkFBaUIsSUFBSSxLQUFLLElBQUksR0FBRztBQUNsRSxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxtQkFBTztBQUFBLGNBQ0wsVUFBVTtBQUFBLFlBQ1o7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQUM7QUFDSDs7O0FFMURBLElBQU8sc0JBQVEsMEJBQTBCLEVBQUUsWUFBWSxLQUFLLENBQUM7IiwKICAibmFtZXMiOiBbImZzIiwgInBhdGgiLCAicGF0aCIsICJmcyJdCn0K
