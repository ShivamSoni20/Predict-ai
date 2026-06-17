import e from "typescript";

import * as i from "node:path";

import { loadRef as a } from "@gql.tada/internal";

import { getGraphQLDiagnostics as r } from "@0no-co/graphqlsp/api";

import { e as n } from "./index-chunk2.mjs";

import { p as o } from "./index-chunk.mjs";

var t = n((async function* _runDiagnostics(n) {
  var t = i.dirname(n.configPath);
  var l = o(n);
  var s = l.createExternalFiles();
  if (s.length) {
    yield {
      kind: "EXTERNAL_WARNING"
    };
    await l.addVirtualFiles(s);
  }
  var g = await a(n.pluginConfig).load({
    rootPath: t
  });
  var f = {
    current: g.current,
    multi: g.multi,
    version: g.version,
    errors: {
      config: null,
      load: new Map,
      write: new Map
    },
    outputLocations: new Map,
    checkStale() {}
  };
  var c = l.build();
  var m = c.buildPluginInfo(n.pluginConfig);
  var d = c.getSourceFiles();
  yield {
    kind: "FILE_COUNT",
    fileCount: d.length
  };
  for (var u of d) {
    var p = u.fileName.endsWith(".vue.ts") || u.fileName.endsWith(".svelte.ts");
    var v = u.fileName;
    m.config = {
      ...m.config,
      shouldCheckForColocatedFragments: p ? !1 : m.config.shouldCheckForColocatedFragments ?? !1,
      trackFieldUsage: p ? !1 : m.config.trackFieldUsage ?? !1
    };
    var h = r(v, f, m);
    var C = [];
    if (h && h.length) {
      for (var y of h) {
        if (!("messageText" in y) || "string" != typeof y.messageText || !y.file) {
          continue;
        }
        var F = "info";
        if (y.category === e.DiagnosticCategory.Error) {
          F = "error";
        } else if (y.category === e.DiagnosticCategory.Warning) {
          F = "warn";
        }
        var k = c.getSourcePosition(u, {
          start: y.start || 1,
          length: y.length || 1
        });
        v = k.fileName;
        C.push({
          severity: F,
          message: y.messageText,
          file: k.fileName,
          line: k.line,
          col: k.col,
          endLine: k.endLine,
          endColumn: k.endColumn
        });
      }
    }
    yield {
      kind: "FILE_DIAGNOSTICS",
      filePath: v,
      messages: C
    };
  }
}));

export { t as runDiagnostics };
//# sourceMappingURL=thread-chunk4.mjs.map
