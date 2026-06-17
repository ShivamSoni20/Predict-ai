import { C as e, o as t, t as n, g as r, f as i, b as a, a as o, i as s, c as u, d as c, p as l, e as d, r as f, h as v, j as p, A as g, k as m, l as E } from "./chunks/api-chunk.mjs";

import T from "node:fs/promises";

import y from "path";

import { resolveTypeScriptRootDir as I, parseConfig as h, loadRef as S, getURLConfig as b, minifyIntrospection as N, outputIntrospectionFile as D, extractIntrospectionHeader as A } from "@gql.tada/internal";

import { SchemaMetaFieldDef as F, TypeMetaFieldDef as k, TypeNameMetaFieldDef as _, isCompositeType as L, Kind as O, isScalarType as M, isObjectType as C, isInterfaceType as x, isUnionType as P, isEnumType as w, isInputObjectType as R, getNamedType as U, isOutputType as j, isInputType as V, GraphQLEnumType as $, GraphQLBoolean as Y, isAbstractType as G, assertAbstractType as B, doTypesOverlap as Q, DirectiveLocation as X, visit as J, parse as K, BREAK as z, isListType as H, isNonNullType as W, GraphQLInterfaceType as q, GraphQLObjectType as Z, GraphQLInputObjectType as ee, getNullableType as te, GraphQLList as ne, GraphQLNonNull as re } from "graphql";

var statFile = (e, t) => T.stat(e).then(t).catch(() => !1);

var swapWrite = async (e, t) => {
  if (!await statFile(e, e => e.isFile())) {
    await T.writeFile(e, t);
  } else {
    var n = e + ".tmp";
    await T.writeFile(n, t);
    try {
      await T.rename(n, e);
    } catch (e) {
      await T.unlink(n);
      throw e;
    } finally {
      await (async e => {
        try {
          var t = new Date;
          await T.utimes(e, t, t);
        } catch (e) {}
      })(e);
    }
  }
};

var toErrorMessage = e => e instanceof Error ? e.message : `${e}`;

var ie = {};

var loadSchema = (e, t) => {
  var n = {
    config: null,
    load: new Map,
    write: new Map
  };
  var r = new Map;
  var i = null;
  var a = null;
  var o = 0;
  var s = {
    errors: n,
    outputLocations: r,
    get current() {
      return i && i.current;
    },
    get multi() {
      return i ? i.multi : ie;
    },
    get version() {
      return i ? i.version : 0;
    },
    checkStale() {
      var e = Date.now();
      if (!a || e - o < 5e3) {
        return;
      }
      o = e;
      a();
    }
  };
  (async () => {
    var o = e.project.getProjectName();
    var s = await I(o) || y.dirname(o);
    t("Got root-directory to resolve schema from: " + s);
    var u;
    try {
      u = h(e.config, s);
    } catch (e) {
      n.config = `${toErrorMessage(e)}. Update the GraphQLSP plugin's entry in "compilerOptions.plugins" in your tsconfig.json.`;
      t(`Found invalid configuration: ${e}`);
      return;
    }
    var c = e.config.tadaDisablePreprocessing ?? !1;
    t('Resolving schema from "schema" config: ' + JSON.stringify(u));
    i = S(u);
    var setLoadError = (e, t) => {
      n.load.set(e || null, `Failed to load the GraphQL schema${e ? ` "${e}"` : ""}: ${toErrorMessage(t)}`);
    };
    var persistSchema = e => {
      if (e && e.tadaOutputLocation) {
        !async function saveTadaIntrospection(e, t, n, r, i, a) {
          try {
            var o = t;
            if (await statFile(o, e => e.isDirectory())) {
              o = y.join(o, "introspection.d.ts");
            } else if (!await statFile(o, e => !!e)) {
              await T.mkdir(y.dirname(o), {
                recursive: !0
              });
              if (await statFile(o, e => e.isDirectory())) {
                o = y.join(o, "introspection.d.ts");
              }
            }
            var s = await T.readFile(o, "utf8").catch(() => {});
            var u = N(e);
            var c = D(u, {
              fileType: t,
              shouldPreprocess: !n,
              preamble: s ? A(s) || void 0 : void 0
            });
            await swapWrite(o, c);
            r.write.delete(t);
            i.set(o, Date.now());
            a(`Introspection saved to path @ ${o}`);
          } catch (e) {
            r.write.set(t, `Failed to write the typings file to "${t}": ${toErrorMessage(e)}`);
            a(`Failed to write introspection @ ${e}`);
          }
        }(e.introspection, y.resolve(s, e.tadaOutputLocation), c, n, r, t);
      }
    };
    var persistAll = () => {
      if (i.current) {
        persistSchema(i.current);
      }
      for (var e in i.multi) {
        persistSchema(i.multi[e]);
      }
    };
    var l = ("schemas" in u ? u.schemas : [ u ]).map(e => e.schema).filter(e => "string" == typeof e && !b(e)).map(e => y.resolve(s, e));
    var d = new Map;
    var recordMtimes = async () => {
      await Promise.all(l.map(async e => {
        try {
          d.set(e, (await T.stat(e)).mtimeMs);
        } catch (e) {}
      }));
    };
    var revalidate = e => i.load({
      rootPath: s,
      reload: e
    }).then(() => {
      n.load.clear();
    }).catch(e => {
      n.load.clear();
      setLoadError(null, e);
    }).then(recordMtimes);
    a = () => {
      (async () => {
        var e = !1;
        for (var n of l) {
          try {
            var r = d.get(n);
            var i = (await T.stat(n)).mtimeMs;
            if (void 0 !== r && i > r) {
              e = !0;
            }
          } catch (e) {}
        }
        if (!e) {
          return;
        }
        t("Schema files changed without watcher events; reloading...");
        await revalidate(!0);
        persistAll();
      })().catch(e => {
        t(`Failed to check schemas for staleness: ${e}`);
      });
    };
    try {
      t("Loading schema...");
      await i.load({
        rootPath: s
      });
      n.load.clear();
    } catch (e) {
      setLoadError(null, e);
      t(`Failed to load schema: ${e}`);
    }
    await recordMtimes();
    persistAll();
    i.autoupdate({
      rootPath: s
    }, (e, t) => {
      revalidate();
      if (!t) {
        return;
      }
      var n = t.name ? e.multi[t.name] : e.current;
      if (n) {
        persistSchema(n);
      }
    }, (e, r) => {
      n.load.delete(null);
      setLoadError(r && r.name, e);
      recordMtimes();
      t(`Failed to load schema${r && r.name ? ` "${r.name}"` : ""} while watching: ${e}`);
    });
  })().catch(e => {
    !function setUnattributedError(e, t) {
      e.load.set(null, `Failed to load the GraphQL schema: ${toErrorMessage(t)}`);
    }(n, e);
    t(`Unexpected error while loading schema: ${e}`);
  });
  return s;
};

function getDefinitionState(e) {
  var t;
  forEachState(e, e => {
    switch (e.kind) {
     case "Query":
     case "ShortQuery":
     case "Mutation":
     case "Subscription":
     case "FragmentDefinition":
      t = e;
    }
  });
  return t;
}

function getFieldDef(e, t, n) {
  if (n === F.name && e.getQueryType() === t) {
    return F;
  }
  if (n === k.name && e.getQueryType() === t) {
    return k;
  }
  if (n === _.name && L(t)) {
    return _;
  }
  if ("getFields" in t) {
    return t.getFields()[n];
  }
  return null;
}

function forEachState(e, t) {
  var n = [];
  var r = e;
  while (null == r ? void 0 : r.kind) {
    n.push(r);
    r = r.prevState;
  }
  for (var i = n.length - 1; i >= 0; i--) {
    t(n[i]);
  }
}

function objectValues(e) {
  var t = Object.keys(e);
  var n = t.length;
  var r = new Array(n);
  for (var i = 0; i < n; ++i) {
    r[i] = e[t[i]];
  }
  return r;
}

function hintList$1(e, t) {
  return function filterAndSortList$1(e, t) {
    if (!t) {
      return filterNonEmpty$1(e, e => !e.isDeprecated);
    }
    var n = e.map(e => ({
      proximity: getProximity$1(normalizeText$1(e.label), t),
      entry: e
    }));
    return filterNonEmpty$1(filterNonEmpty$1(n, e => e.proximity <= 2), e => !e.entry.isDeprecated).sort((e, t) => (e.entry.isDeprecated ? 1 : 0) - (t.entry.isDeprecated ? 1 : 0) || e.proximity - t.proximity || e.entry.label.length - t.entry.label.length).map(e => e.entry);
  }(t, normalizeText$1(e.string));
}

function filterNonEmpty$1(e, t) {
  var n = e.filter(t);
  return 0 === n.length ? e : n;
}

function normalizeText$1(e) {
  return e.toLowerCase().replaceAll(/\W/g, "");
}

function getProximity$1(e, t) {
  var n = function lexicalDistance$1(e, t) {
    var n;
    var r;
    var i = [];
    var a = e.length;
    var o = t.length;
    for (n = 0; n <= a; n++) {
      i[n] = [ n ];
    }
    for (r = 1; r <= o; r++) {
      i[0][r] = r;
    }
    for (n = 1; n <= a; n++) {
      for (r = 1; r <= o; r++) {
        var s = e[n - 1] === t[r - 1] ? 0 : 1;
        i[n][r] = Math.min(i[n - 1][r] + 1, i[n][r - 1] + 1, i[n - 1][r - 1] + s);
        if (n > 1 && r > 1 && e[n - 1] === t[r - 2] && e[n - 2] === t[r - 1]) {
          i[n][r] = Math.min(i[n][r], i[n - 2][r - 2] + s);
        }
      }
    }
    return i[a][o];
  }(t, e);
  if (e.length > t.length) {
    n -= e.length - t.length - 1;
    n += 0 === e.indexOf(t) ? 0 : .5;
  }
  return n;
}

var ae;

!function(e) {
  e.is = function is(e) {
    return "string" == typeof e;
  };
}(ae || (ae = {}));

var oe;

!function(e) {
  e.is = function is(e) {
    return "string" == typeof e;
  };
}(oe || (oe = {}));

var se;

!function(e) {
  e.MIN_VALUE = -2147483648;
  e.MAX_VALUE = 2147483647;
  e.is = function is(t) {
    return "number" == typeof t && e.MIN_VALUE <= t && t <= e.MAX_VALUE;
  };
}(se || (se = {}));

var ue;

!function(e) {
  e.MIN_VALUE = 0;
  e.MAX_VALUE = 2147483647;
  e.is = function is(t) {
    return "number" == typeof t && e.MIN_VALUE <= t && t <= e.MAX_VALUE;
  };
}(ue || (ue = {}));

var ce;

!function(e) {
  e.create = function create(e, t) {
    if (e === Number.MAX_VALUE) {
      e = ue.MAX_VALUE;
    }
    if (t === Number.MAX_VALUE) {
      t = ue.MAX_VALUE;
    }
    return {
      line: e,
      character: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.uinteger(t.line) && Lt.uinteger(t.character);
  };
}(ce || (ce = {}));

var le;

!function(e) {
  e.create = function create(e, t, n, r) {
    if (Lt.uinteger(e) && Lt.uinteger(t) && Lt.uinteger(n) && Lt.uinteger(r)) {
      return {
        start: ce.create(e, t),
        end: ce.create(n, r)
      };
    } else if (ce.is(e) && ce.is(t)) {
      return {
        start: e,
        end: t
      };
    } else {
      throw new Error(`Range#create called with invalid arguments[${e}, ${t}, ${n}, ${r}]`);
    }
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && ce.is(t.start) && ce.is(t.end);
  };
}(le || (le = {}));

var de;

!function(e) {
  e.create = function create(e, t) {
    return {
      uri: e,
      range: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && le.is(t.range) && (Lt.string(t.uri) || Lt.undefined(t.uri));
  };
}(de || (de = {}));

var fe;

!function(e) {
  e.create = function create(e, t, n, r) {
    return {
      targetUri: e,
      targetRange: t,
      targetSelectionRange: n,
      originSelectionRange: r
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && le.is(t.targetRange) && Lt.string(t.targetUri) && le.is(t.targetSelectionRange) && (le.is(t.originSelectionRange) || Lt.undefined(t.originSelectionRange));
  };
}(fe || (fe = {}));

var ve;

!function(e) {
  e.create = function create(e, t, n, r) {
    return {
      red: e,
      green: t,
      blue: n,
      alpha: r
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.numberRange(t.red, 0, 1) && Lt.numberRange(t.green, 0, 1) && Lt.numberRange(t.blue, 0, 1) && Lt.numberRange(t.alpha, 0, 1);
  };
}(ve || (ve = {}));

var pe;

!function(e) {
  e.create = function create(e, t) {
    return {
      range: e,
      color: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && le.is(t.range) && ve.is(t.color);
  };
}(pe || (pe = {}));

var ge;

!function(e) {
  e.create = function create(e, t, n) {
    return {
      label: e,
      textEdit: t,
      additionalTextEdits: n
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.string(t.label) && (Lt.undefined(t.textEdit) || Ne.is(t)) && (Lt.undefined(t.additionalTextEdits) || Lt.typedArray(t.additionalTextEdits, Ne.is));
  };
}(ge || (ge = {}));

var me;

!function(e) {
  e.Comment = "comment";
  e.Imports = "imports";
  e.Region = "region";
}(me || (me = {}));

var Ee;

!function(e) {
  e.create = function create(e, t, n, r, i, a) {
    var o = {
      startLine: e,
      endLine: t
    };
    if (Lt.defined(n)) {
      o.startCharacter = n;
    }
    if (Lt.defined(r)) {
      o.endCharacter = r;
    }
    if (Lt.defined(i)) {
      o.kind = i;
    }
    if (Lt.defined(a)) {
      o.collapsedText = a;
    }
    return o;
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.uinteger(t.startLine) && Lt.uinteger(t.startLine) && (Lt.undefined(t.startCharacter) || Lt.uinteger(t.startCharacter)) && (Lt.undefined(t.endCharacter) || Lt.uinteger(t.endCharacter)) && (Lt.undefined(t.kind) || Lt.string(t.kind));
  };
}(Ee || (Ee = {}));

var Te;

!function(e) {
  e.create = function create(e, t) {
    return {
      location: e,
      message: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && de.is(t.location) && Lt.string(t.message);
  };
}(Te || (Te = {}));

var ye;

!function(e) {
  e.Error = 1;
  e.Warning = 2;
  e.Information = 3;
  e.Hint = 4;
}(ye || (ye = {}));

var Ie;

!function(e) {
  e.Unnecessary = 1;
  e.Deprecated = 2;
}(Ie || (Ie = {}));

var he;

!function(e) {
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.string(t.href);
  };
}(he || (he = {}));

var Se;

!function(e) {
  e.create = function create(e, t, n, r, i, a) {
    var o = {
      range: e,
      message: t
    };
    if (Lt.defined(n)) {
      o.severity = n;
    }
    if (Lt.defined(r)) {
      o.code = r;
    }
    if (Lt.defined(i)) {
      o.source = i;
    }
    if (Lt.defined(a)) {
      o.relatedInformation = a;
    }
    return o;
  };
  e.is = function is(e) {
    var t;
    var n = e;
    return Lt.defined(n) && le.is(n.range) && Lt.string(n.message) && (Lt.number(n.severity) || Lt.undefined(n.severity)) && (Lt.integer(n.code) || Lt.string(n.code) || Lt.undefined(n.code)) && (Lt.undefined(n.codeDescription) || Lt.string(null === (t = n.codeDescription) || void 0 === t ? void 0 : t.href)) && (Lt.string(n.source) || Lt.undefined(n.source)) && (Lt.undefined(n.relatedInformation) || Lt.typedArray(n.relatedInformation, Te.is));
  };
}(Se || (Se = {}));

var be;

!function(e) {
  e.create = function create(e, t, ...n) {
    var r = {
      title: e,
      command: t
    };
    if (Lt.defined(n) && n.length > 0) {
      r.arguments = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.string(t.title) && Lt.string(t.command);
  };
}(be || (be = {}));

var Ne;

!function(e) {
  e.replace = function replace(e, t) {
    return {
      range: e,
      newText: t
    };
  };
  e.insert = function insert(e, t) {
    return {
      range: {
        start: e,
        end: e
      },
      newText: t
    };
  };
  e.del = function del(e) {
    return {
      range: e,
      newText: ""
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.string(t.newText) && le.is(t.range);
  };
}(Ne || (Ne = {}));

var De;

!function(e) {
  e.create = function create(e, t, n) {
    var r = {
      label: e
    };
    if (void 0 !== t) {
      r.needsConfirmation = t;
    }
    if (void 0 !== n) {
      r.description = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && Lt.string(t.label) && (Lt.boolean(t.needsConfirmation) || void 0 === t.needsConfirmation) && (Lt.string(t.description) || void 0 === t.description);
  };
}(De || (De = {}));

var Ae;

!function(e) {
  e.is = function is(e) {
    return Lt.string(e);
  };
}(Ae || (Ae = {}));

var Fe;

!function(e) {
  e.replace = function replace(e, t, n) {
    return {
      range: e,
      newText: t,
      annotationId: n
    };
  };
  e.insert = function insert(e, t, n) {
    return {
      range: {
        start: e,
        end: e
      },
      newText: t,
      annotationId: n
    };
  };
  e.del = function del(e, t) {
    return {
      range: e,
      newText: "",
      annotationId: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Ne.is(t) && (De.is(t.annotationId) || Ae.is(t.annotationId));
  };
}(Fe || (Fe = {}));

var ke;

!function(e) {
  e.create = function create(e, t) {
    return {
      textDocument: e,
      edits: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Pe.is(t.textDocument) && Array.isArray(t.edits);
  };
}(ke || (ke = {}));

var _e;

!function(e) {
  e.create = function create(e, t, n) {
    var r = {
      kind: "create",
      uri: e
    };
    if (void 0 !== t && (void 0 !== t.overwrite || void 0 !== t.ignoreIfExists)) {
      r.options = t;
    }
    if (void 0 !== n) {
      r.annotationId = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return t && "create" === t.kind && Lt.string(t.uri) && (void 0 === t.options || (void 0 === t.options.overwrite || Lt.boolean(t.options.overwrite)) && (void 0 === t.options.ignoreIfExists || Lt.boolean(t.options.ignoreIfExists))) && (void 0 === t.annotationId || Ae.is(t.annotationId));
  };
}(_e || (_e = {}));

var Le;

!function(e) {
  e.create = function create(e, t, n, r) {
    var i = {
      kind: "rename",
      oldUri: e,
      newUri: t
    };
    if (void 0 !== n && (void 0 !== n.overwrite || void 0 !== n.ignoreIfExists)) {
      i.options = n;
    }
    if (void 0 !== r) {
      i.annotationId = r;
    }
    return i;
  };
  e.is = function is(e) {
    var t = e;
    return t && "rename" === t.kind && Lt.string(t.oldUri) && Lt.string(t.newUri) && (void 0 === t.options || (void 0 === t.options.overwrite || Lt.boolean(t.options.overwrite)) && (void 0 === t.options.ignoreIfExists || Lt.boolean(t.options.ignoreIfExists))) && (void 0 === t.annotationId || Ae.is(t.annotationId));
  };
}(Le || (Le = {}));

var Oe;

!function(e) {
  e.create = function create(e, t, n) {
    var r = {
      kind: "delete",
      uri: e
    };
    if (void 0 !== t && (void 0 !== t.recursive || void 0 !== t.ignoreIfNotExists)) {
      r.options = t;
    }
    if (void 0 !== n) {
      r.annotationId = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return t && "delete" === t.kind && Lt.string(t.uri) && (void 0 === t.options || (void 0 === t.options.recursive || Lt.boolean(t.options.recursive)) && (void 0 === t.options.ignoreIfNotExists || Lt.boolean(t.options.ignoreIfNotExists))) && (void 0 === t.annotationId || Ae.is(t.annotationId));
  };
}(Oe || (Oe = {}));

var Me;

!function(e) {
  e.is = function is(e) {
    return e && (void 0 !== e.changes || void 0 !== e.documentChanges) && (void 0 === e.documentChanges || e.documentChanges.every(e => {
      if (Lt.string(e.kind)) {
        return _e.is(e) || Le.is(e) || Oe.is(e);
      } else {
        return ke.is(e);
      }
    }));
  };
}(Me || (Me = {}));

var Ce;

!function(e) {
  e.create = function create(e) {
    return {
      uri: e
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.string(t.uri);
  };
}(Ce || (Ce = {}));

var xe;

!function(e) {
  e.create = function create(e, t) {
    return {
      uri: e,
      version: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.string(t.uri) && Lt.integer(t.version);
  };
}(xe || (xe = {}));

var Pe;

!function(e) {
  e.create = function create(e, t) {
    return {
      uri: e,
      version: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.string(t.uri) && (null === t.version || Lt.integer(t.version));
  };
}(Pe || (Pe = {}));

var we;

!function(e) {
  e.create = function create(e, t, n, r) {
    return {
      uri: e,
      languageId: t,
      version: n,
      text: r
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.string(t.uri) && Lt.string(t.languageId) && Lt.integer(t.version) && Lt.string(t.text);
  };
}(we || (we = {}));

var Re;

!function(e) {
  e.PlainText = "plaintext";
  e.Markdown = "markdown";
  e.is = function is(t) {
    return t === e.PlainText || t === e.Markdown;
  };
}(Re || (Re = {}));

var Ue;

!function(e) {
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(e) && Re.is(t.kind) && Lt.string(t.value);
  };
}(Ue || (Ue = {}));

var je;

!function(e) {
  e.Text = 1;
  e.Method = 2;
  e.Function = 3;
  e.Constructor = 4;
  e.Field = 5;
  e.Variable = 6;
  e.Class = 7;
  e.Interface = 8;
  e.Module = 9;
  e.Property = 10;
  e.Unit = 11;
  e.Value = 12;
  e.Enum = 13;
  e.Keyword = 14;
  e.Snippet = 15;
  e.Color = 16;
  e.File = 17;
  e.Reference = 18;
  e.Folder = 19;
  e.EnumMember = 20;
  e.Constant = 21;
  e.Struct = 22;
  e.Event = 23;
  e.Operator = 24;
  e.TypeParameter = 25;
}(je || (je = {}));

var Ve;

!function(e) {
  e.PlainText = 1;
  e.Snippet = 2;
}(Ve || (Ve = {}));

var $e;

!function(e) {
  e.Deprecated = 1;
}($e || ($e = {}));

var Ye;

!function(e) {
  e.create = function create(e, t, n) {
    return {
      newText: e,
      insert: t,
      replace: n
    };
  };
  e.is = function is(e) {
    var t = e;
    return t && Lt.string(t.newText) && le.is(t.insert) && le.is(t.replace);
  };
}(Ye || (Ye = {}));

var Ge;

!function(e) {
  e.asIs = 1;
  e.adjustIndentation = 2;
}(Ge || (Ge = {}));

var Be;

!function(e) {
  e.is = function is(e) {
    var t = e;
    return t && (Lt.string(t.detail) || void 0 === t.detail) && (Lt.string(t.description) || void 0 === t.description);
  };
}(Be || (Be = {}));

var Qe;

!function(e) {
  e.create = function create(e) {
    return {
      label: e
    };
  };
}(Qe || (Qe = {}));

var Xe;

!function(e) {
  e.create = function create(e, t) {
    return {
      items: e ? e : [],
      isIncomplete: !!t
    };
  };
}(Xe || (Xe = {}));

var Je;

!function(e) {
  e.fromPlainText = function fromPlainText(e) {
    return e.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
  };
  e.is = function is(e) {
    var t = e;
    return Lt.string(t) || Lt.objectLiteral(t) && Lt.string(t.language) && Lt.string(t.value);
  };
}(Je || (Je = {}));

var Ke;

!function(e) {
  e.is = function is(e) {
    var t = e;
    return !!t && Lt.objectLiteral(t) && (Ue.is(t.contents) || Je.is(t.contents) || Lt.typedArray(t.contents, Je.is)) && (void 0 === e.range || le.is(e.range));
  };
}(Ke || (Ke = {}));

var ze;

!function(e) {
  e.create = function create(e, t) {
    return t ? {
      label: e,
      documentation: t
    } : {
      label: e
    };
  };
}(ze || (ze = {}));

var He;

!function(e) {
  e.create = function create(e, t, ...n) {
    var r = {
      label: e
    };
    if (Lt.defined(t)) {
      r.documentation = t;
    }
    if (Lt.defined(n)) {
      r.parameters = n;
    } else {
      r.parameters = [];
    }
    return r;
  };
}(He || (He = {}));

var We;

!function(e) {
  e.Text = 1;
  e.Read = 2;
  e.Write = 3;
}(We || (We = {}));

var qe;

!function(e) {
  e.create = function create(e, t) {
    var n = {
      range: e
    };
    if (Lt.number(t)) {
      n.kind = t;
    }
    return n;
  };
}(qe || (qe = {}));

var Ze;

!function(e) {
  e.File = 1;
  e.Module = 2;
  e.Namespace = 3;
  e.Package = 4;
  e.Class = 5;
  e.Method = 6;
  e.Property = 7;
  e.Field = 8;
  e.Constructor = 9;
  e.Enum = 10;
  e.Interface = 11;
  e.Function = 12;
  e.Variable = 13;
  e.Constant = 14;
  e.String = 15;
  e.Number = 16;
  e.Boolean = 17;
  e.Array = 18;
  e.Object = 19;
  e.Key = 20;
  e.Null = 21;
  e.EnumMember = 22;
  e.Struct = 23;
  e.Event = 24;
  e.Operator = 25;
  e.TypeParameter = 26;
}(Ze || (Ze = {}));

var et;

!function(e) {
  e.Deprecated = 1;
}(et || (et = {}));

var tt;

!function(e) {
  e.create = function create(e, t, n, r, i) {
    var a = {
      name: e,
      kind: t,
      location: {
        uri: r,
        range: n
      }
    };
    if (i) {
      a.containerName = i;
    }
    return a;
  };
}(tt || (tt = {}));

var nt;

!function(e) {
  e.create = function create(e, t, n, r) {
    return void 0 !== r ? {
      name: e,
      kind: t,
      location: {
        uri: n,
        range: r
      }
    } : {
      name: e,
      kind: t,
      location: {
        uri: n
      }
    };
  };
}(nt || (nt = {}));

var rt;

!function(e) {
  e.create = function create(e, t, n, r, i, a) {
    var o = {
      name: e,
      detail: t,
      kind: n,
      range: r,
      selectionRange: i
    };
    if (void 0 !== a) {
      o.children = a;
    }
    return o;
  };
  e.is = function is(e) {
    var t = e;
    return t && Lt.string(t.name) && Lt.number(t.kind) && le.is(t.range) && le.is(t.selectionRange) && (void 0 === t.detail || Lt.string(t.detail)) && (void 0 === t.deprecated || Lt.boolean(t.deprecated)) && (void 0 === t.children || Array.isArray(t.children)) && (void 0 === t.tags || Array.isArray(t.tags));
  };
}(rt || (rt = {}));

var it;

!function(e) {
  e.Empty = "";
  e.QuickFix = "quickfix";
  e.Refactor = "refactor";
  e.RefactorExtract = "refactor.extract";
  e.RefactorInline = "refactor.inline";
  e.RefactorRewrite = "refactor.rewrite";
  e.Source = "source";
  e.SourceOrganizeImports = "source.organizeImports";
  e.SourceFixAll = "source.fixAll";
}(it || (it = {}));

var at;

!function(e) {
  e.Invoked = 1;
  e.Automatic = 2;
}(at || (at = {}));

var ot;

!function(e) {
  e.create = function create(e, t, n) {
    var r = {
      diagnostics: e
    };
    if (null != t) {
      r.only = t;
    }
    if (null != n) {
      r.triggerKind = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.typedArray(t.diagnostics, Se.is) && (void 0 === t.only || Lt.typedArray(t.only, Lt.string)) && (void 0 === t.triggerKind || t.triggerKind === at.Invoked || t.triggerKind === at.Automatic);
  };
}(ot || (ot = {}));

var st;

!function(e) {
  e.create = function create(e, t, n) {
    var r = {
      title: e
    };
    var i = !0;
    if ("string" == typeof t) {
      i = !1;
      r.kind = t;
    } else if (be.is(t)) {
      r.command = t;
    } else {
      r.edit = t;
    }
    if (i && void 0 !== n) {
      r.kind = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return t && Lt.string(t.title) && (void 0 === t.diagnostics || Lt.typedArray(t.diagnostics, Se.is)) && (void 0 === t.kind || Lt.string(t.kind)) && (void 0 !== t.edit || void 0 !== t.command) && (void 0 === t.command || be.is(t.command)) && (void 0 === t.isPreferred || Lt.boolean(t.isPreferred)) && (void 0 === t.edit || Me.is(t.edit));
  };
}(st || (st = {}));

var ut;

!function(e) {
  e.create = function create(e, t) {
    var n = {
      range: e
    };
    if (Lt.defined(t)) {
      n.data = t;
    }
    return n;
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && le.is(t.range) && (Lt.undefined(t.command) || be.is(t.command));
  };
}(ut || (ut = {}));

var ct;

!function(e) {
  e.create = function create(e, t) {
    return {
      tabSize: e,
      insertSpaces: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.uinteger(t.tabSize) && Lt.boolean(t.insertSpaces);
  };
}(ct || (ct = {}));

var lt;

!function(e) {
  e.create = function create(e, t, n) {
    return {
      range: e,
      target: t,
      data: n
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && le.is(t.range) && (Lt.undefined(t.target) || Lt.string(t.target));
  };
}(lt || (lt = {}));

var dt;

!function(e) {
  e.create = function create(e, t) {
    return {
      range: e,
      parent: t
    };
  };
  e.is = function is(t) {
    var n = t;
    return Lt.objectLiteral(n) && le.is(n.range) && (void 0 === n.parent || e.is(n.parent));
  };
}(dt || (dt = {}));

var ft;

!function(e) {
  e.namespace = "namespace";
  e.type = "type";
  e.class = "class";
  e.enum = "enum";
  e.interface = "interface";
  e.struct = "struct";
  e.typeParameter = "typeParameter";
  e.parameter = "parameter";
  e.variable = "variable";
  e.property = "property";
  e.enumMember = "enumMember";
  e.event = "event";
  e.function = "function";
  e.method = "method";
  e.macro = "macro";
  e.keyword = "keyword";
  e.modifier = "modifier";
  e.comment = "comment";
  e.string = "string";
  e.number = "number";
  e.regexp = "regexp";
  e.operator = "operator";
  e.decorator = "decorator";
}(ft || (ft = {}));

var vt;

!function(e) {
  e.declaration = "declaration";
  e.definition = "definition";
  e.readonly = "readonly";
  e.static = "static";
  e.deprecated = "deprecated";
  e.abstract = "abstract";
  e.async = "async";
  e.modification = "modification";
  e.documentation = "documentation";
  e.defaultLibrary = "defaultLibrary";
}(vt || (vt = {}));

var pt;

!function(e) {
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && (void 0 === t.resultId || "string" == typeof t.resultId) && Array.isArray(t.data) && (0 === t.data.length || "number" == typeof t.data[0]);
  };
}(pt || (pt = {}));

var gt;

!function(e) {
  e.create = function create(e, t) {
    return {
      range: e,
      text: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return null != t && le.is(t.range) && Lt.string(t.text);
  };
}(gt || (gt = {}));

var mt;

!function(e) {
  e.create = function create(e, t, n) {
    return {
      range: e,
      variableName: t,
      caseSensitiveLookup: n
    };
  };
  e.is = function is(e) {
    var t = e;
    return null != t && le.is(t.range) && Lt.boolean(t.caseSensitiveLookup) && (Lt.string(t.variableName) || void 0 === t.variableName);
  };
}(mt || (mt = {}));

var Et;

!function(e) {
  e.create = function create(e, t) {
    return {
      range: e,
      expression: t
    };
  };
  e.is = function is(e) {
    var t = e;
    return null != t && le.is(t.range) && (Lt.string(t.expression) || void 0 === t.expression);
  };
}(Et || (Et = {}));

var Tt;

!function(e) {
  e.create = function create(e, t) {
    return {
      frameId: e,
      stoppedLocation: t
    };
  };
  e.is = function is(e) {
    return Lt.defined(e) && le.is(e.stoppedLocation);
  };
}(Tt || (Tt = {}));

var yt;

!function(e) {
  e.Type = 1;
  e.Parameter = 2;
  e.is = function is(e) {
    return 1 === e || 2 === e;
  };
}(yt || (yt = {}));

var It;

!function(e) {
  e.create = function create(e) {
    return {
      value: e
    };
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && (void 0 === t.tooltip || Lt.string(t.tooltip) || Ue.is(t.tooltip)) && (void 0 === t.location || de.is(t.location)) && (void 0 === t.command || be.is(t.command));
  };
}(It || (It = {}));

var ht;

!function(e) {
  e.create = function create(e, t, n) {
    var r = {
      position: e,
      label: t
    };
    if (void 0 !== n) {
      r.kind = n;
    }
    return r;
  };
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && ce.is(t.position) && (Lt.string(t.label) || Lt.typedArray(t.label, It.is)) && (void 0 === t.kind || yt.is(t.kind)) && void 0 === t.textEdits || Lt.typedArray(t.textEdits, Ne.is) && (void 0 === t.tooltip || Lt.string(t.tooltip) || Ue.is(t.tooltip)) && (void 0 === t.paddingLeft || Lt.boolean(t.paddingLeft)) && (void 0 === t.paddingRight || Lt.boolean(t.paddingRight));
  };
}(ht || (ht = {}));

var St;

!function(e) {
  e.createSnippet = function createSnippet(e) {
    return {
      kind: "snippet",
      value: e
    };
  };
}(St || (St = {}));

var bt;

!function(e) {
  e.create = function create(e, t, n, r) {
    return {
      insertText: e,
      filterText: t,
      range: n,
      command: r
    };
  };
}(bt || (bt = {}));

var Nt;

!function(e) {
  e.create = function create(e) {
    return {
      items: e
    };
  };
}(Nt || (Nt = {}));

var Dt;

!function(e) {
  e.Invoked = 0;
  e.Automatic = 1;
}(Dt || (Dt = {}));

var At;

!function(e) {
  e.create = function create(e, t) {
    return {
      range: e,
      text: t
    };
  };
}(At || (At = {}));

var Ft;

!function(e) {
  e.create = function create(e, t) {
    return {
      triggerKind: e,
      selectedCompletionInfo: t
    };
  };
}(Ft || (Ft = {}));

var kt;

!function(e) {
  e.is = function is(e) {
    var t = e;
    return Lt.objectLiteral(t) && oe.is(t.uri) && Lt.string(t.name);
  };
}(kt || (kt = {}));

var _t;

!function(e) {
  e.create = function create(e, t, n, r) {
    return new FullTextDocument(e, t, n, r);
  };
  e.is = function is(e) {
    var t = e;
    return Lt.defined(t) && Lt.string(t.uri) && (Lt.undefined(t.languageId) || Lt.string(t.languageId)) && Lt.uinteger(t.lineCount) && Lt.func(t.getText) && Lt.func(t.positionAt) && Lt.func(t.offsetAt) ? !0 : !1;
  };
  e.applyEdits = function applyEdits(e, t) {
    var n = e.getText();
    var r = mergeSort(t, (e, t) => {
      var n = e.range.start.line - t.range.start.line;
      if (0 === n) {
        return e.range.start.character - t.range.start.character;
      }
      return n;
    });
    var i = n.length;
    for (var a = r.length - 1; a >= 0; a--) {
      var o = r[a];
      var s = e.offsetAt(o.range.start);
      var u = e.offsetAt(o.range.end);
      if (u <= i) {
        n = n.substring(0, s) + o.newText + n.substring(u, n.length);
      } else {
        throw new Error("Overlapping edit");
      }
      i = s;
    }
    return n;
  };
  function mergeSort(e, t) {
    if (e.length <= 1) {
      return e;
    }
    var n = e.length / 2 | 0;
    var r = e.slice(0, n);
    var i = e.slice(n);
    mergeSort(r, t);
    mergeSort(i, t);
    var a = 0;
    var o = 0;
    var s = 0;
    while (a < r.length && o < i.length) {
      if (t(r[a], i[o]) <= 0) {
        e[s++] = r[a++];
      } else {
        e[s++] = i[o++];
      }
    }
    while (a < r.length) {
      e[s++] = r[a++];
    }
    while (o < i.length) {
      e[s++] = i[o++];
    }
    return e;
  }
}(_t || (_t = {}));

class FullTextDocument {
  constructor(e, t, n, r) {
    this._uri = e;
    this._languageId = t;
    this._version = n;
    this._content = r;
    this._lineOffsets = void 0;
  }
  get uri() {
    return this._uri;
  }
  get languageId() {
    return this._languageId;
  }
  get version() {
    return this._version;
  }
  getText(e) {
    if (e) {
      var t = this.offsetAt(e.start);
      var n = this.offsetAt(e.end);
      return this._content.substring(t, n);
    }
    return this._content;
  }
  update(e, t) {
    this._content = e.text;
    this._version = t;
    this._lineOffsets = void 0;
  }
  getLineOffsets() {
    if (void 0 === this._lineOffsets) {
      var e = [];
      var t = this._content;
      var n = !0;
      for (var r = 0; r < t.length; r++) {
        if (n) {
          e.push(r);
          n = !1;
        }
        var i = t.charAt(r);
        n = "\r" === i || "\n" === i;
        if ("\r" === i && r + 1 < t.length && "\n" === t.charAt(r + 1)) {
          r++;
        }
      }
      if (n && t.length > 0) {
        e.push(t.length);
      }
      this._lineOffsets = e;
    }
    return this._lineOffsets;
  }
  positionAt(e) {
    e = Math.max(Math.min(e, this._content.length), 0);
    var t = this.getLineOffsets();
    var n = 0, r = t.length;
    if (0 === r) {
      return ce.create(0, e);
    }
    while (n < r) {
      var i = Math.floor((n + r) / 2);
      if (t[i] > e) {
        r = i;
      } else {
        n = i + 1;
      }
    }
    var a = n - 1;
    return ce.create(a, e - t[a]);
  }
  offsetAt(e) {
    var t = this.getLineOffsets();
    if (e.line >= t.length) {
      return this._content.length;
    } else if (e.line < 0) {
      return 0;
    }
    var n = t[e.line];
    return Math.max(Math.min(n + e.character, e.line + 1 < t.length ? t[e.line + 1] : this._content.length), n);
  }
  get lineCount() {
    return this.getLineOffsets().length;
  }
}

var Lt;

!function(e) {
  var t = Object.prototype.toString;
  e.defined = function defined(e) {
    return void 0 !== e;
  };
  e.undefined = function undefined$1(e) {
    return void 0 === e;
  };
  e.boolean = function boolean(e) {
    return !0 === e || !1 === e;
  };
  e.string = function string(e) {
    return "[object String]" === t.call(e);
  };
  e.number = function number(e) {
    return "[object Number]" === t.call(e);
  };
  e.numberRange = function numberRange(e, n, r) {
    return "[object Number]" === t.call(e) && n <= e && e <= r;
  };
  e.integer = function integer(e) {
    return "[object Number]" === t.call(e) && -2147483648 <= e && e <= 2147483647;
  };
  e.uinteger = function uinteger(e) {
    return "[object Number]" === t.call(e) && 0 <= e && e <= 2147483647;
  };
  e.func = function func(e) {
    return "[object Function]" === t.call(e);
  };
  e.objectLiteral = function objectLiteral(e) {
    return null !== e && "object" == typeof e;
  };
  e.typedArray = function typedArray(e, t) {
    return Array.isArray(e) && e.every(t);
  };
}(Lt || (Lt = {}));

var Ot;

!function(e) {
  e.Text = 1;
  e.Method = 2;
  e.Function = 3;
  e.Constructor = 4;
  e.Field = 5;
  e.Variable = 6;
  e.Class = 7;
  e.Interface = 8;
  e.Module = 9;
  e.Property = 10;
  e.Unit = 11;
  e.Value = 12;
  e.Enum = 13;
  e.Keyword = 14;
  e.Snippet = 15;
  e.Color = 16;
  e.File = 17;
  e.Reference = 18;
  e.Folder = 19;
  e.EnumMember = 20;
  e.Constant = 21;
  e.Struct = 22;
  e.Event = 23;
  e.Operator = 24;
  e.TypeParameter = 25;
}(Ot || (Ot = {}));

var Mt = Object.assign(Object.assign({}, O), {
  ALIASED_FIELD: "AliasedField",
  ARGUMENTS: "Arguments",
  SHORT_QUERY: "ShortQuery",
  QUERY: "Query",
  MUTATION: "Mutation",
  SUBSCRIPTION: "Subscription",
  TYPE_CONDITION: "TypeCondition",
  INVALID: "Invalid",
  COMMENT: "Comment",
  SCHEMA_DEF: "SchemaDef",
  SCALAR_DEF: "ScalarDef",
  OBJECT_TYPE_DEF: "ObjectTypeDef",
  OBJECT_VALUE: "ObjectValue",
  LIST_VALUE: "ListValue",
  INTERFACE_DEF: "InterfaceDef",
  UNION_DEF: "UnionDef",
  ENUM_DEF: "EnumDef",
  ENUM_VALUE: "EnumValue",
  FIELD_DEF: "FieldDef",
  INPUT_DEF: "InputDef",
  INPUT_VALUE_DEF: "InputValueDef",
  ARGUMENTS_DEF: "ArgumentsDef",
  EXTEND_DEF: "ExtendDef",
  EXTENSION_DEFINITION: "ExtensionDefinition",
  DIRECTIVE_DEF: "DirectiveDef",
  IMPLEMENTS: "Implements",
  VARIABLE_DEFINITIONS: "VariableDefinitions",
  TYPE: "Type"
});

var Ct = {
  command: "editor.action.triggerSuggest",
  title: "Suggestions"
};

var xt = [ O.SCHEMA_DEFINITION, O.OPERATION_TYPE_DEFINITION, O.SCALAR_TYPE_DEFINITION, O.OBJECT_TYPE_DEFINITION, O.INTERFACE_TYPE_DEFINITION, O.UNION_TYPE_DEFINITION, O.ENUM_TYPE_DEFINITION, O.INPUT_OBJECT_TYPE_DEFINITION, O.DIRECTIVE_DEFINITION, O.SCHEMA_EXTENSION, O.SCALAR_TYPE_EXTENSION, O.OBJECT_TYPE_EXTENSION, O.INTERFACE_TYPE_EXTENSION, O.UNION_TYPE_EXTENSION, O.ENUM_TYPE_EXTENSION, O.INPUT_OBJECT_TYPE_EXTENSION ];

function getAutocompleteSuggestions(e, t, n, r, i, a) {
  var o;
  var s = Object.assign(Object.assign({}, a), {
    schema: e
  });
  var u = r || getTokenAtPosition(t, n, 1);
  var c = "Invalid" === u.state.kind ? u.state.prevState : u.state;
  var l = (null == a ? void 0 : a.mode) || function getDocumentMode(e, t) {
    if (null == t ? void 0 : t.endsWith(".graphqls")) {
      return wt.TYPE_SYSTEM;
    }
    return (e => {
      var t = !1;
      if (e) {
        try {
          J(K(e), {
            enter(e) {
              if ("Document" === e.kind) {
                return;
              }
              if (xt.includes(e.kind)) {
                t = !0;
                return z;
              }
              return !1;
            }
          });
        } catch (e) {
          return t;
        }
      }
      return t;
    })(e) ? wt.TYPE_SYSTEM : wt.EXECUTABLE;
  }(t, null == a ? void 0 : a.uri);
  if (!c) {
    return [];
  }
  var {kind: d, step: f, prevState: v} = c;
  var p = getTypeInfo(e, u.state);
  if (d === Mt.DOCUMENT) {
    if (l === wt.TYPE_SYSTEM) {
      return function getSuggestionsForTypeSystemDefinitions(e) {
        return hintList$1(e, [ {
          label: "extend",
          kind: Ot.Function
        }, {
          label: "type",
          kind: Ot.Function
        }, {
          label: "interface",
          kind: Ot.Function
        }, {
          label: "union",
          kind: Ot.Function
        }, {
          label: "input",
          kind: Ot.Function
        }, {
          label: "scalar",
          kind: Ot.Function
        }, {
          label: "schema",
          kind: Ot.Function
        } ]);
      }(u);
    }
    return function getSuggestionsForExecutableDefinitions(e) {
      return hintList$1(e, [ {
        label: "query",
        kind: Ot.Function
      }, {
        label: "mutation",
        kind: Ot.Function
      }, {
        label: "subscription",
        kind: Ot.Function
      }, {
        label: "fragment",
        kind: Ot.Function
      }, {
        label: "{",
        kind: Ot.Constructor
      } ]);
    }(u);
  }
  if (d === Mt.EXTEND_DEF) {
    return function getSuggestionsForExtensionDefinitions(e) {
      return hintList$1(e, [ {
        label: "type",
        kind: Ot.Function
      }, {
        label: "interface",
        kind: Ot.Function
      }, {
        label: "union",
        kind: Ot.Function
      }, {
        label: "input",
        kind: Ot.Function
      }, {
        label: "scalar",
        kind: Ot.Function
      }, {
        label: "schema",
        kind: Ot.Function
      } ]);
    }(u);
  }
  if ((null === (o = null == v ? void 0 : v.prevState) || void 0 === o ? void 0 : o.kind) === Mt.EXTENSION_DEFINITION && c.name) {
    return hintList$1(u, []);
  }
  if ((null == v ? void 0 : v.kind) === O.SCALAR_TYPE_EXTENSION) {
    return hintList$1(u, Object.values(e.getTypeMap()).filter(M).map(e => ({
      label: e.name,
      kind: Ot.Function
    })));
  }
  if ((null == v ? void 0 : v.kind) === O.OBJECT_TYPE_EXTENSION) {
    return hintList$1(u, Object.values(e.getTypeMap()).filter(e => C(e) && !e.name.startsWith("__")).map(e => ({
      label: e.name,
      kind: Ot.Function
    })));
  }
  if ((null == v ? void 0 : v.kind) === O.INTERFACE_TYPE_EXTENSION) {
    return hintList$1(u, Object.values(e.getTypeMap()).filter(x).map(e => ({
      label: e.name,
      kind: Ot.Function
    })));
  }
  if ((null == v ? void 0 : v.kind) === O.UNION_TYPE_EXTENSION) {
    return hintList$1(u, Object.values(e.getTypeMap()).filter(P).map(e => ({
      label: e.name,
      kind: Ot.Function
    })));
  }
  if ((null == v ? void 0 : v.kind) === O.ENUM_TYPE_EXTENSION) {
    return hintList$1(u, Object.values(e.getTypeMap()).filter(e => w(e) && !e.name.startsWith("__")).map(e => ({
      label: e.name,
      kind: Ot.Function
    })));
  }
  if ((null == v ? void 0 : v.kind) === O.INPUT_OBJECT_TYPE_EXTENSION) {
    return hintList$1(u, Object.values(e.getTypeMap()).filter(R).map(e => ({
      label: e.name,
      kind: Ot.Function
    })));
  }
  if (d === Mt.IMPLEMENTS || d === Mt.NAMED_TYPE && (null == v ? void 0 : v.kind) === Mt.IMPLEMENTS) {
    return function getSuggestionsForImplements(e, t, n, r, i) {
      if (t.needsSeparator) {
        return [];
      }
      var a = n.getTypeMap();
      var o = objectValues(a).filter(x);
      var s = o.map(({name: e}) => e);
      var u = new Set;
      runOnlineParser$1(r, (e, t) => {
        var r, a, o, c, l;
        if (t.name) {
          if (t.kind === Mt.INTERFACE_DEF && !s.includes(t.name)) {
            u.add(t.name);
          }
          if (t.kind === Mt.NAMED_TYPE && (null === (r = t.prevState) || void 0 === r ? void 0 : r.kind) === Mt.IMPLEMENTS) {
            if (i.interfaceDef) {
              if (null === (a = i.interfaceDef) || void 0 === a ? void 0 : a.getInterfaces().find(({name: e}) => e === t.name)) {
                return;
              }
              var d = n.getType(t.name);
              var f = null === (o = i.interfaceDef) || void 0 === o ? void 0 : o.toConfig();
              i.interfaceDef = new q(Object.assign(Object.assign({}, f), {
                interfaces: [ ...f.interfaces, d || new q({
                  name: t.name,
                  fields: {}
                }) ]
              }));
            } else if (i.objectTypeDef) {
              if (null === (c = i.objectTypeDef) || void 0 === c ? void 0 : c.getInterfaces().find(({name: e}) => e === t.name)) {
                return;
              }
              var v = n.getType(t.name);
              var p = null === (l = i.objectTypeDef) || void 0 === l ? void 0 : l.toConfig();
              i.objectTypeDef = new Z(Object.assign(Object.assign({}, p), {
                interfaces: [ ...p.interfaces, v || new q({
                  name: t.name,
                  fields: {}
                }) ]
              }));
            }
          }
        }
      });
      var c = i.interfaceDef || i.objectTypeDef;
      var l = ((null == c ? void 0 : c.getInterfaces()) || []).map(({name: e}) => e);
      var d = o.concat([ ...u ].map(e => ({
        name: e
      }))).filter(({name: e}) => e !== (null == c ? void 0 : c.name) && !l.includes(e));
      return hintList$1(e, d.map(e => {
        var t = {
          label: e.name,
          kind: Ot.Interface,
          type: e
        };
        if (null == e ? void 0 : e.description) {
          t.documentation = e.description;
        }
        return t;
      }));
    }(u, c, e, t, p);
  }
  if (d === Mt.SELECTION_SET || d === Mt.FIELD || d === Mt.ALIASED_FIELD) {
    return function getSuggestionsForFieldNames(e, t, n) {
      var r;
      if (t.parentType) {
        var {parentType: i} = t;
        var a = [];
        if ("getFields" in i) {
          a = objectValues(i.getFields());
        }
        if (L(i)) {
          a.push(_);
        }
        if (i === (null === (r = null == n ? void 0 : n.schema) || void 0 === r ? void 0 : r.getQueryType())) {
          a.push(F, k);
        }
        return hintList$1(e, a.map((e, t) => {
          var r;
          var i = {
            sortText: String(t) + e.name,
            label: e.name,
            detail: String(e.type),
            documentation: null !== (r = e.description) && void 0 !== r ? r : void 0,
            deprecated: Boolean(e.deprecationReason),
            isDeprecated: Boolean(e.deprecationReason),
            deprecationReason: e.deprecationReason,
            kind: Ot.Field,
            type: e.type
          };
          if (null == n ? void 0 : n.fillLeafsOnComplete) {
            var a = getInsertText(e);
            if (a) {
              i.insertText = e.name + a;
              i.insertTextFormat = Ve.Snippet;
              i.command = Ct;
            }
          }
          return i;
        }));
      }
      return [];
    }(u, p, s);
  }
  if (d === Mt.ARGUMENTS || d === Mt.ARGUMENT && 0 === f) {
    var {argDefs: g} = p;
    if (g) {
      return hintList$1(u, g.map(e => {
        var t;
        return {
          label: e.name,
          insertText: e.name + ": ",
          command: Ct,
          detail: String(e.type),
          documentation: null !== (t = e.description) && void 0 !== t ? t : void 0,
          kind: Ot.Variable,
          type: e.type
        };
      }));
    }
  }
  if ((d === Mt.OBJECT_VALUE || d === Mt.OBJECT_FIELD && 0 === f) && p.objectFieldDefs) {
    var m = objectValues(p.objectFieldDefs);
    var E = d === Mt.OBJECT_VALUE ? Ot.Value : Ot.Field;
    return hintList$1(u, m.map(e => {
      var t;
      return {
        label: e.name,
        detail: String(e.type),
        documentation: null !== (t = e.description) && void 0 !== t ? t : void 0,
        kind: E,
        type: e.type
      };
    }));
  }
  if (d === Mt.ENUM_VALUE || d === Mt.LIST_VALUE && 1 === f || d === Mt.OBJECT_FIELD && 2 === f || d === Mt.ARGUMENT && 2 === f) {
    return function getSuggestionsForInputValues(e, t, n, r) {
      var i = U(t.inputType);
      var a = getVariableCompletions(n, r, e).filter(e => e.detail === i.name);
      if (i instanceof $) {
        return hintList$1(e, i.getValues().map(e => {
          var t;
          return {
            label: e.name,
            detail: String(i),
            documentation: null !== (t = e.description) && void 0 !== t ? t : void 0,
            deprecated: Boolean(e.deprecationReason),
            isDeprecated: Boolean(e.deprecationReason),
            deprecationReason: e.deprecationReason,
            kind: Ot.EnumMember,
            type: i
          };
        }).concat(a));
      }
      if (i === Y) {
        return hintList$1(e, a.concat([ {
          label: "true",
          detail: String(Y),
          documentation: "Not false.",
          kind: Ot.Variable,
          type: Y
        }, {
          label: "false",
          detail: String(Y),
          documentation: "Not true.",
          kind: Ot.Variable,
          type: Y
        } ]));
      }
      return a;
    }(u, p, t, e);
  }
  if (d === Mt.VARIABLE && 1 === f) {
    var T = U(p.inputType);
    return hintList$1(u, getVariableCompletions(t, e, u).filter(e => e.detail === (null == T ? void 0 : T.name)));
  }
  if (d === Mt.TYPE_CONDITION && 1 === f || d === Mt.NAMED_TYPE && null != v && v.kind === Mt.TYPE_CONDITION) {
    return function getSuggestionsForFragmentTypeConditions(e, t, n, r) {
      var i;
      if (t.parentType) {
        if (G(t.parentType)) {
          var a = B(t.parentType);
          var o = n.getPossibleTypes(a);
          var s = Object.create(null);
          for (var u of o) {
            for (var c of u.getInterfaces()) {
              s[c.name] = c;
            }
          }
          i = o.concat(objectValues(s));
        } else {
          i = [ t.parentType ];
        }
      } else {
        i = objectValues(n.getTypeMap()).filter(e => L(e) && !e.name.startsWith("__"));
      }
      return hintList$1(e, i.map(e => {
        var t = U(e);
        return {
          label: String(e),
          documentation: (null == t ? void 0 : t.description) || "",
          kind: Ot.Field
        };
      }));
    }(u, p, e);
  }
  if (d === Mt.FRAGMENT_SPREAD && 1 === f) {
    return function getSuggestionsForFragmentSpread$1(e, t, n, r, i) {
      if (!r) {
        return [];
      }
      var a = n.getTypeMap();
      var o = getDefinitionState(e.state);
      var s = function getFragmentDefinitions(e) {
        var t = [];
        runOnlineParser$1(e, (e, n) => {
          if (n.kind === Mt.FRAGMENT_DEFINITION && n.name && n.type) {
            t.push({
              kind: Mt.FRAGMENT_DEFINITION,
              name: {
                kind: O.NAME,
                value: n.name
              },
              selectionSet: {
                kind: Mt.SELECTION_SET,
                selections: []
              },
              typeCondition: {
                kind: Mt.NAMED_TYPE,
                name: {
                  kind: O.NAME,
                  value: n.type
                }
              }
            });
          }
        });
        return t;
      }(r);
      if (i && i.length > 0) {
        s.push(...i);
      }
      var u = s.filter(e => a[e.typeCondition.name.value] && !(o && o.kind === Mt.FRAGMENT_DEFINITION && o.name === e.name.value) && L(t.parentType) && L(a[e.typeCondition.name.value]) && Q(n, t.parentType, a[e.typeCondition.name.value]));
      return hintList$1(e, u.map(e => ({
        label: e.name.value,
        detail: String(a[e.typeCondition.name.value]),
        documentation: `fragment ${e.name.value} on ${e.typeCondition.name.value}`,
        kind: Ot.Field,
        type: a[e.typeCondition.name.value]
      })));
    }(u, p, e, t, Array.isArray(i) ? i : (e => {
      var t = [];
      if (e) {
        try {
          J(K(e), {
            FragmentDefinition(e) {
              t.push(e);
            }
          });
        } catch (e) {
          return [];
        }
      }
      return t;
    })(i));
  }
  var y = unwrapType(c);
  if (l === wt.TYPE_SYSTEM && !y.needsAdvance && d === Mt.NAMED_TYPE || d === Mt.LIST_TYPE) {
    if (y.kind === Mt.FIELD_DEF) {
      return hintList$1(u, Object.values(e.getTypeMap()).filter(e => j(e) && !e.name.startsWith("__")).map(e => ({
        label: e.name,
        kind: Ot.Function
      })));
    }
    if (y.kind === Mt.INPUT_VALUE_DEF) {
      return hintList$1(u, Object.values(e.getTypeMap()).filter(e => V(e) && !e.name.startsWith("__")).map(e => ({
        label: e.name,
        kind: Ot.Function
      })));
    }
  }
  if (d === Mt.VARIABLE_DEFINITION && 2 === f || d === Mt.LIST_TYPE && 1 === f || d === Mt.NAMED_TYPE && v && (v.kind === Mt.VARIABLE_DEFINITION || v.kind === Mt.LIST_TYPE || v.kind === Mt.NON_NULL_TYPE)) {
    return function getSuggestionsForVariableDefinition(e, t, n) {
      var r = t.getTypeMap();
      var i = objectValues(r).filter(V);
      return hintList$1(e, i.map(e => ({
        label: e.name,
        documentation: e.description,
        kind: Ot.Variable
      })));
    }(u, e);
  }
  if (d === Mt.DIRECTIVE) {
    return function getSuggestionsForDirective(e, t, n, r) {
      var i;
      if (null === (i = t.prevState) || void 0 === i ? void 0 : i.kind) {
        var a = n.getDirectives().filter(e => function canUseDirective(e, t) {
          if (!(null == e ? void 0 : e.kind)) {
            return !1;
          }
          var {kind: n, prevState: r} = e;
          var {locations: i} = t;
          switch (n) {
           case Mt.QUERY:
            return i.includes(X.QUERY);

           case Mt.MUTATION:
            return i.includes(X.MUTATION);

           case Mt.SUBSCRIPTION:
            return i.includes(X.SUBSCRIPTION);

           case Mt.FIELD:
           case Mt.ALIASED_FIELD:
            return i.includes(X.FIELD);

           case Mt.FRAGMENT_DEFINITION:
            return i.includes(X.FRAGMENT_DEFINITION);

           case Mt.FRAGMENT_SPREAD:
            return i.includes(X.FRAGMENT_SPREAD);

           case Mt.INLINE_FRAGMENT:
            return i.includes(X.INLINE_FRAGMENT);

           case Mt.SCHEMA_DEF:
            return i.includes(X.SCHEMA);

           case Mt.SCALAR_DEF:
            return i.includes(X.SCALAR);

           case Mt.OBJECT_TYPE_DEF:
            return i.includes(X.OBJECT);

           case Mt.FIELD_DEF:
            return i.includes(X.FIELD_DEFINITION);

           case Mt.INTERFACE_DEF:
            return i.includes(X.INTERFACE);

           case Mt.UNION_DEF:
            return i.includes(X.UNION);

           case Mt.ENUM_DEF:
            return i.includes(X.ENUM);

           case Mt.ENUM_VALUE:
            return i.includes(X.ENUM_VALUE);

           case Mt.INPUT_DEF:
            return i.includes(X.INPUT_OBJECT);

           case Mt.INPUT_VALUE_DEF:
            switch (null == r ? void 0 : r.kind) {
             case Mt.ARGUMENTS_DEF:
              return i.includes(X.ARGUMENT_DEFINITION);

             case Mt.INPUT_DEF:
              return i.includes(X.INPUT_FIELD_DEFINITION);
            }
          }
          return !1;
        }(t.prevState, e));
        return hintList$1(e, a.map(e => ({
          label: e.name,
          documentation: e.description || "",
          kind: Ot.Function
        })));
      }
      return [];
    }(u, c, e);
  }
  return [];
}

var Pt = " {\n  $1\n}";

var getInsertText = e => {
  var {type: t} = e;
  if (L(t)) {
    return Pt;
  }
  if (H(t) && L(t.ofType)) {
    return Pt;
  }
  if (W(t)) {
    if (L(t.ofType)) {
      return Pt;
    }
    if (H(t.ofType) && L(t.ofType.ofType)) {
      return Pt;
    }
  }
  return null;
};

var getParentDefinition$1 = (e, t) => {
  var n, r, i, a, o, s, u, c, l, d;
  if ((null === (n = e.prevState) || void 0 === n ? void 0 : n.kind) === t) {
    return e.prevState;
  }
  if ((null === (i = null === (r = e.prevState) || void 0 === r ? void 0 : r.prevState) || void 0 === i ? void 0 : i.kind) === t) {
    return e.prevState.prevState;
  }
  if ((null === (s = null === (o = null === (a = e.prevState) || void 0 === a ? void 0 : a.prevState) || void 0 === o ? void 0 : o.prevState) || void 0 === s ? void 0 : s.kind) === t) {
    return e.prevState.prevState.prevState;
  }
  if ((null === (d = null === (l = null === (c = null === (u = e.prevState) || void 0 === u ? void 0 : u.prevState) || void 0 === c ? void 0 : c.prevState) || void 0 === l ? void 0 : l.prevState) || void 0 === d ? void 0 : d.kind) === t) {
    return e.prevState.prevState.prevState.prevState;
  }
};

function getVariableCompletions(e, t, n) {
  var r = null;
  var i;
  var a = Object.create({});
  runOnlineParser$1(e, (e, o) => {
    if ((null == o ? void 0 : o.kind) === Mt.VARIABLE && o.name) {
      r = o.name;
    }
    if ((null == o ? void 0 : o.kind) === Mt.NAMED_TYPE && r) {
      var s = getParentDefinition$1(o, Mt.TYPE);
      if (null == s ? void 0 : s.type) {
        i = t.getType(null == s ? void 0 : s.type);
      }
    }
    if (r && i && !a[r]) {
      a[r] = {
        detail: i.toString(),
        insertText: "$" === n.string ? r : "$" + r,
        label: r,
        type: i,
        kind: Ot.Variable
      };
      r = null;
      i = null;
    }
  });
  return objectValues(a);
}

function getTokenAtPosition(e, t, n = 0) {
  var r = null;
  var i = null;
  var a = null;
  var o = runOnlineParser$1(e, (e, o, s, u) => {
    if (u !== t.line || e.getCurrentPosition() + n < t.character + 1) {
      return;
    }
    r = s;
    i = Object.assign({}, o);
    a = e.current();
    return "BREAK";
  });
  return {
    start: o.start,
    end: o.end,
    string: a || o.string,
    state: i || o.state,
    style: r || o.style
  };
}

function runOnlineParser$1(n, r) {
  var i = n.split("\n");
  var a = t();
  var o = a.startState();
  var s = "";
  var u = new e("");
  for (var c = 0; c < i.length; c++) {
    u = new e(i[c]);
    while (!u.eol()) {
      if ("BREAK" === r(u, o, s = a.token(u, o), c)) {
        break;
      }
    }
    r(u, o, s, c);
    if (!o.kind) {
      o = a.startState();
    }
  }
  return {
    start: u.getStartOfToken(),
    end: u.getCurrentPosition(),
    string: u.current(),
    state: o,
    style: s
  };
}

function getTypeInfo(e, t) {
  var n;
  var r;
  var i;
  var a;
  var o;
  var s;
  var u;
  var c;
  var l;
  var d;
  var f;
  forEachState(t, t => {
    var v;
    switch (t.kind) {
     case Mt.QUERY:
     case "ShortQuery":
      d = e.getQueryType();
      break;

     case Mt.MUTATION:
      d = e.getMutationType();
      break;

     case Mt.SUBSCRIPTION:
      d = e.getSubscriptionType();
      break;

     case Mt.INLINE_FRAGMENT:
     case Mt.FRAGMENT_DEFINITION:
      if (t.type) {
        d = e.getType(t.type);
      }
      break;

     case Mt.FIELD:
     case Mt.ALIASED_FIELD:
      if (!d || !t.name) {
        o = null;
      } else {
        o = l ? getFieldDef(e, l, t.name) : null;
        d = o ? o.type : null;
      }
      break;

     case Mt.SELECTION_SET:
      l = U(d);
      break;

     case Mt.DIRECTIVE:
      i = t.name ? e.getDirective(t.name) : null;
      break;

     case Mt.INTERFACE_DEF:
      if (t.name) {
        u = null;
        f = new q({
          name: t.name,
          interfaces: [],
          fields: {}
        });
      }
      break;

     case Mt.OBJECT_TYPE_DEF:
      if (t.name) {
        f = null;
        u = new Z({
          name: t.name,
          interfaces: [],
          fields: {}
        });
      }
      break;

     case Mt.ARGUMENTS:
      if (t.prevState) {
        switch (t.prevState.kind) {
         case Mt.FIELD:
          r = o && o.args;
          break;

         case Mt.DIRECTIVE:
          r = i && i.args;
          break;

         case Mt.ALIASED_FIELD:
          var p = null === (v = t.prevState) || void 0 === v ? void 0 : v.name;
          if (!p) {
            r = null;
            break;
          }
          var g = l ? getFieldDef(e, l, p) : null;
          if (!g) {
            r = null;
            break;
          }
          r = g.args;
          break;

         default:
          r = null;
        }
      } else {
        r = null;
      }
      break;

     case Mt.ARGUMENT:
      if (r) {
        for (var m = 0; m < r.length; m++) {
          if (r[m].name === t.name) {
            n = r[m];
            break;
          }
        }
      }
      s = null == n ? void 0 : n.type;
      break;

     case Mt.ENUM_VALUE:
      var E = U(s);
      a = E instanceof $ ? E.getValues().find(e => e.value === t.name) : null;
      break;

     case Mt.LIST_VALUE:
      var T = te(s);
      s = T instanceof ne ? T.ofType : null;
      break;

     case Mt.OBJECT_VALUE:
      var y = U(s);
      c = y instanceof ee ? y.getFields() : null;
      break;

     case Mt.OBJECT_FIELD:
      var I = t.name && c ? c[t.name] : null;
      s = null == I ? void 0 : I.type;
      break;

     case Mt.NAMED_TYPE:
      if (t.name) {
        d = e.getType(t.name);
      }
    }
  });
  return {
    argDef: n,
    argDefs: r,
    directiveDef: i,
    enumValue: a,
    fieldDef: o,
    inputType: s,
    objectFieldDefs: c,
    parentType: l,
    type: d,
    interfaceDef: f,
    objectTypeDef: u
  };
}

var wt;

!function(e) {
  e.TYPE_SYSTEM = "TYPE_SYSTEM";
  e.EXECUTABLE = "EXECUTABLE";
}(wt || (wt = {}));

function unwrapType(e) {
  if (e.prevState && e.kind && [ Mt.NAMED_TYPE, Mt.LIST_TYPE, Mt.TYPE, Mt.NON_NULL_TYPE ].includes(e.kind)) {
    return unwrapType(e.prevState);
  }
  return e;
}

function getHoverInformation(e, t, n, r, i) {
  var a = r || getTokenAtPosition(t, n);
  if (!e || !a || !a.state) {
    return "";
  }
  var {kind: o, step: s} = a.state;
  var u = getTypeInfo(e, a.state);
  var c = Object.assign(Object.assign({}, i), {
    schema: e
  });
  if ("Field" === o && 0 === s && u.fieldDef || "AliasedField" === o && 2 === s && u.fieldDef) {
    var l = [];
    renderMdCodeStart(l, c);
    !function renderField(e, t, n) {
      renderQualifiedField(e, t, n);
      renderTypeAnnotation(e, t, n, t.type);
    }(l, u, c);
    renderMdCodeEnd(l, c);
    renderDescription(l, c, u.fieldDef);
    return l.join("").trim();
  }
  if ("Directive" === o && 1 === s && u.directiveDef) {
    var d = [];
    renderMdCodeStart(d, c);
    renderDirective(d, u);
    renderMdCodeEnd(d, c);
    renderDescription(d, c, u.directiveDef);
    return d.join("").trim();
  }
  if ("Argument" === o && 0 === s && u.argDef) {
    var f = [];
    renderMdCodeStart(f, c);
    !function renderArg(e, t, n) {
      if (t.directiveDef) {
        renderDirective(e, t);
      } else if (t.fieldDef) {
        renderQualifiedField(e, t, n);
      }
      if (!t.argDef) {
        return;
      }
      var {name: r} = t.argDef;
      text(e, "(");
      text(e, r);
      renderTypeAnnotation(e, t, n, t.inputType);
      text(e, ")");
    }(f, u, c);
    renderMdCodeEnd(f, c);
    renderDescription(f, c, u.argDef);
    return f.join("").trim();
  }
  if ("EnumValue" === o && u.enumValue && "description" in u.enumValue) {
    var v = [];
    renderMdCodeStart(v, c);
    !function renderEnumValue(e, t, n) {
      if (!t.enumValue) {
        return;
      }
      var {name: r} = t.enumValue;
      renderType(e, t, n, t.inputType);
      text(e, ".");
      text(e, r);
    }(v, u, c);
    renderMdCodeEnd(v, c);
    renderDescription(v, c, u.enumValue);
    return v.join("").trim();
  }
  if ("NamedType" === o && u.type && "description" in u.type) {
    var p = [];
    renderMdCodeStart(p, c);
    renderType(p, u, c, u.type);
    renderMdCodeEnd(p, c);
    renderDescription(p, c, u.type);
    return p.join("").trim();
  }
  return "";
}

function renderMdCodeStart(e, t) {
  if (t.useMarkdown) {
    text(e, "```graphql\n");
  }
}

function renderMdCodeEnd(e, t) {
  if (t.useMarkdown) {
    text(e, "\n```");
  }
}

function renderQualifiedField(e, t, n) {
  if (!t.fieldDef) {
    return;
  }
  var r = t.fieldDef.name;
  if ("__" !== r.slice(0, 2)) {
    renderType(e, t, n, t.parentType);
    text(e, ".");
  }
  text(e, r);
}

function renderDirective(e, t, n) {
  if (!t.directiveDef) {
    return;
  }
  text(e, "@" + t.directiveDef.name);
}

function renderTypeAnnotation(e, t, n, r) {
  text(e, ": ");
  renderType(e, t, n, r);
}

function renderType(e, t, n, r) {
  if (!r) {
    return;
  }
  if (r instanceof re) {
    renderType(e, t, n, r.ofType);
    text(e, "!");
  } else if (r instanceof ne) {
    text(e, "[");
    renderType(e, t, n, r.ofType);
    text(e, "]");
  } else {
    text(e, r.name);
  }
}

function renderDescription(e, t, n) {
  if (!n) {
    return;
  }
  var r = "string" == typeof n.description ? n.description : null;
  if (r) {
    text(e, "\n\n");
    text(e, r);
  }
  !function renderDeprecation(e, t, n) {
    if (!n) {
      return;
    }
    var r = n.deprecationReason || null;
    if (!r) {
      return;
    }
    text(e, "\n\n");
    text(e, "Deprecated: ");
    text(e, r);
  }(e, 0, n);
}

function text(e, t) {
  e.push(t);
}

class Cursor {
  constructor(e, t) {
    this.line = e;
    this.character = t;
  }
  setLine(e) {
    this.line = e;
  }
  setCharacter(e) {
    this.character = e;
  }
  lessThanOrEqualTo(e) {
    return this.line < e.line || this.line === e.line && this.character <= e.character;
  }
}

var getToken = (r, i) => {
  if (!n.isTemplateLiteral(r) && !n.isStringLiteralLike(r)) {
    return;
  }
  var a = r.getText().slice(1, -1).split("\n");
  var o = t();
  var s = o.startState();
  var u = r.getStart() + 1;
  var c = void 0;
  var l = void 0;
  for (var d = 0; d < a.length; d++) {
    if (c) {
      continue;
    }
    var f = u - 1;
    var v = new e(a[d] + "\n");
    while (!v.eol()) {
      var p = o.token(v, s);
      var g = v.current();
      if (f + v.getStartOfToken() + 1 <= i && f + v.getCurrentPosition() >= i) {
        c = l ? l : {
          line: d,
          start: v.getStartOfToken() + 1,
          end: v.getCurrentPosition(),
          string: g,
          state: s,
          tokenKind: p
        };
        break;
      } else if ("on" === g) {
        l = {
          line: d,
          start: v.getStartOfToken() + 1,
          end: v.getCurrentPosition(),
          string: g,
          state: s,
          tokenKind: p
        };
      } else if ("." === g || ".." === g) {
        l = {
          line: d,
          start: v.getStartOfToken() + 1,
          end: v.getCurrentPosition(),
          string: g,
          state: s,
          tokenKind: p
        };
      } else {
        l = void 0;
      }
    }
    u += a[d].length + 1;
  }
  return c;
};

function hintList(e, t) {
  return function filterAndSortList(e, t) {
    if (!t) {
      return filterNonEmpty(e, e => !e.isDeprecated);
    }
    var n = e.map(e => ({
      proximity: getProximity(normalizeText(e.label), t),
      entry: e
    }));
    return filterNonEmpty(filterNonEmpty(n, e => e.proximity <= 2), e => !e.entry.isDeprecated).sort((e, t) => (e.entry.isDeprecated ? 1 : 0) - (t.entry.isDeprecated ? 1 : 0) || e.proximity - t.proximity || e.entry.label.length - t.entry.label.length).map(e => e.entry);
  }(t, normalizeText(e.string));
}

function filterNonEmpty(e, t) {
  var n = e.filter(t);
  return 0 === n.length ? e : n;
}

function normalizeText(e) {
  return e.toLowerCase().replace(/\W/g, "");
}

function getProximity(e, t) {
  var n = function lexicalDistance(e, t) {
    var n;
    var r;
    var i = [];
    var a = e.length;
    var o = t.length;
    for (n = 0; n <= a; n++) {
      i[n] = [ n ];
    }
    for (r = 1; r <= o; r++) {
      i[0][r] = r;
    }
    for (n = 1; n <= a; n++) {
      for (r = 1; r <= o; r++) {
        var s = e[n - 1] === t[r - 1] ? 0 : 1;
        i[n][r] = Math.min(i[n - 1][r] + 1, i[n][r - 1] + 1, i[n - 1][r - 1] + s);
        if (n > 1 && r > 1 && e[n - 1] === t[r - 2] && e[n - 2] === t[r - 1]) {
          i[n][r] = Math.min(i[n][r], i[n - 2][r - 2] + s);
        }
      }
    }
    return i[a][o];
  }(t, e);
  if (e.length > t.length) {
    n -= e.length - t.length - 1;
    n += 0 === e.indexOf(t) ? 0 : .5;
  }
  return n;
}

function getGraphQLCompletions(e, t, v, p) {
  var g = p.config.templateIsCallExpression ?? !0;
  var m = p.languageService.getProgram()?.getTypeChecker();
  var E = r(p, e);
  if (!E) {
    return;
  }
  var T = i(E, t);
  if (!T) {
    return;
  }
  T = g ? a(T) : o(T);
  var y, I, h;
  if (g && s(T, m)) {
    var S = u(T, m);
    h = S && v.multi[S] ? v.multi[S]?.schema : v.current?.schema;
    var b = getToken(T.arguments[0], t);
    if (!h || !b || "." === b.string || ".." === b.string) {
      return;
    }
    y = `${T.arguments[0].getText().slice(1, -1)}\n${c(T, p).map(e => l(e)).join("\n")}`;
    I = new Cursor(b.line, b.start - 1);
  } else if (!g && d(T)) {
    var N = getToken(T.template, t);
    if (!N || !v.current || "." === N.string || ".." === N.string) {
      return;
    }
    var {combinedText: D, resolvedSpans: A} = f(T, e, p);
    var F = A.filter(e => e.original.start < t && e.original.start + e.original.length < t).reduce((e, t) => e + (t.lines - 1), 0);
    N.line = N.line + F;
    y = D;
    I = new Cursor(N.line, N.start - 1);
    h = v.current.schema;
  } else {
    return;
  }
  var [k, _] = function getSuggestionsInternal(e, t, n) {
    var r = getTokenAtPosition(t, n);
    var i = [];
    try {
      i = K(t, {
        noLocation: !0
      }).definitions.filter(e => e.kind === O.FRAGMENT_DEFINITION);
    } catch (e) {}
    var a = "on" === r.string && "TypeCondition" === r.state.kind;
    var o = getAutocompleteSuggestions(e, t, n, a ? {
      ...r,
      state: {
        ...r.state,
        step: 1
      },
      type: null
    } : void 0);
    var s = !a ? function getSuggestionsForFragmentSpread(e, t, n, r, i) {
      if (!r) {
        return [];
      }
      var a = n.getTypeMap();
      var o = getDefinitionState(e.state);
      return hintList(e, i.filter(e => a[e.typeCondition.name.value] && !(o && o.kind === Mt.FRAGMENT_DEFINITION && o.name === e.name.value) && L(t.parentType) && L(a[e.typeCondition.name.value]) && Q(n, t.parentType, a[e.typeCondition.name.value])).map(e => ({
        label: e.name.value,
        detail: String(a[e.typeCondition.name.value]),
        documentation: `fragment ${e.name.value} on ${e.typeCondition.name.value}`,
        kind: Ot.Field,
        type: a[e.typeCondition.name.value]
      })));
    }(r, getTypeInfo(e, r.state), e, t, i) : [];
    var u = "Invalid" === r.state.kind ? r.state.prevState : r.state;
    var c = getParentDefinition(r.state, Mt.FIELD)?.name;
    if (u && c) {
      var {kind: l} = u;
      if (l === Mt.ARGUMENTS || l === Mt.ARGUMENT) {
        var d = new Set;
        runOnlineParser(t, (e, t) => {
          if (t.kind === Mt.ARGUMENT) {
            var n = getParentDefinition(t, Mt.FIELD);
            if (c && t.name && n?.name === c) {
              d.add(t.name);
            }
          }
        });
        o = o.filter(e => !d.has(e.label));
      }
      if (l === Mt.SELECTION_SET || l === Mt.FIELD || l === Mt.ALIASED_FIELD) {
        var f = new Set;
        var v = getUsedFragments(t, c);
        runOnlineParser(t, (e, t) => {
          if (t.kind === Mt.FIELD || t.kind === Mt.ALIASED_FIELD) {
            var n = getParentDefinition(t, Mt.FIELD);
            if (n && n.name === c && t.name) {
              f.add(t.name);
            }
          }
        });
        o = o.filter(e => !f.has(e.label));
        s = s.filter(e => !v.has(e.label));
      }
      if (l === Mt.FRAGMENT_SPREAD) {
        var p = getUsedFragments(t, c);
        o = o.filter(e => !p.has(e.label));
        s = s.filter(e => !p.has(e.label));
      }
    }
    return [ o, s ];
  }(h, y, I);
  return {
    isGlobalCompletion: !1,
    isMemberCompletion: !1,
    isNewIdentifierLocation: !1,
    entries: [ ...k.map(e => ({
      ...e,
      kind: n.ScriptElementKind.variableElement,
      name: e.label,
      kindModifiers: "declare",
      sortText: e.sortText || "0",
      labelDetails: {
        detail: e.type ? " " + e.type?.toString() : void 0,
        description: e.documentation
      }
    })), ..._.map(e => ({
      ...e,
      kind: n.ScriptElementKind.variableElement,
      name: e.label,
      insertText: "..." + e.label,
      kindModifiers: "declare",
      sortText: "0",
      labelDetails: {
        description: e.documentation
      }
    })) ]
  };
}

function getUsedFragments(e, t) {
  var n = new Set;
  runOnlineParser(e, (e, r) => {
    if (r.kind === Mt.FRAGMENT_SPREAD && r.name) {
      var i = getParentDefinition(r, Mt.FIELD);
      if (t && i?.name === t) {
        n.add(r.name);
      }
    }
  });
  return n;
}

function getParentDefinition(e, t) {
  if (e.prevState?.kind === t) {
    return e.prevState;
  }
  if (e.prevState?.prevState?.kind === t) {
    return e.prevState.prevState;
  }
  if (e.prevState?.prevState?.prevState?.kind === t) {
    return e.prevState.prevState.prevState;
  }
  if (e.prevState?.prevState?.prevState?.prevState?.kind === t) {
    return e.prevState.prevState.prevState.prevState;
  }
}

function runOnlineParser(n, r) {
  var i = n.split("\n");
  var a = t();
  var o = a.startState();
  var s = "";
  var u = new e("");
  for (var c = 0; c < i.length; c++) {
    u = new e(i[c]);
    while (!u.eol()) {
      if ("BREAK" === r(u, o, s = a.token(u, o), c)) {
        break;
      }
    }
    r(u, o, s, c);
    if (!o.kind) {
      o = a.startState();
    }
  }
  return {
    start: u.getStartOfToken(),
    end: u.getCurrentPosition(),
    string: u.current(),
    state: o,
    style: s
  };
}

function create(e) {
  var logger = t => e.project.projectService.logger.info(`[GraphQLSP] ${t}`);
  var t = e.config;
  logger("config: " + JSON.stringify(t));
  logger("Setting up the GraphQL Plugin");
  if (t.template) {
    p.add(t.template);
  }
  var c = function createBasicDecorator(e) {
    var t = Object.create(null);
    var _loop = function() {
      var r = e.languageService[n];
      t[n] = (...t) => r.apply(e.languageService, t);
    };
    for (var n of Object.keys(e.languageService)) {
      _loop();
    }
    return t;
  }(e);
  var l = loadSchema(e, logger);
  var guard = (e, t, n) => {
    try {
      return n();
    } catch (n) {
      logger(`Unexpected error in ${e}: ${n}`);
      return t;
    }
  };
  c.getSemanticDiagnostics = t => {
    var n = e.languageService.getSemanticDiagnostics(t);
    return guard("getSemanticDiagnostics", n, () => {
      l.checkStale();
      if (n.some(e => g.includes(e.code))) {
        return n;
      }
      var r = m(t, l, e);
      return r ? [ ...r, ...n ] : n;
    });
  };
  c.getCompletionsAtPosition = (t, n, r) => {
    var i = guard("getCompletionsAtPosition", void 0, () => getGraphQLCompletions(t, n, l, e));
    if (i && i.entries.length) {
      return i;
    } else {
      return e.languageService.getCompletionsAtPosition(t, n, r) || {
        isGlobalCompletion: !1,
        isMemberCompletion: !1,
        isNewIdentifierLocation: !1,
        entries: []
      };
    }
  };
  c.getEditsForRefactor = (t, n, r, i, a, o, s) => {
    var u = e.languageService.getEditsForRefactor(t, n, r, i, a, o, s);
    var c = guard("getEditsForRefactor", void 0, () => E(t, "number" == typeof r ? r : r.pos, e));
    if (!c) {
      return u;
    }
    return {
      edits: [ {
        fileName: t,
        textChanges: [ {
          newText: c.replacement,
          span: c.span
        } ]
      } ]
    };
  };
  c.getApplicableRefactors = (t, n, r, i, a, o) => {
    var s = e.languageService.getApplicableRefactors(t, n, r, i, a, o);
    if (guard("getApplicableRefactors", void 0, () => E(t, "number" == typeof n ? n : n.pos, e))) {
      return [ {
        name: "GraphQL",
        description: "Operations specific to gql.tada!",
        actions: [ {
          name: "Insert document-id",
          description: "Generate a document-id for your persisted-operation, by default a SHA256 hash."
        } ],
        inlineable: !0
      }, ...s ];
    } else {
      return s;
    }
  };
  c.getQuickInfoAtPosition = (...t) => {
    var [c, v] = t;
    var p = guard("getQuickInfoAtPosition", void 0, () => function getGraphQLQuickInfo(e, t, c, l) {
      var v = l.config.templateIsCallExpression ?? !0;
      var p = l.languageService.getProgram()?.getTypeChecker();
      var g = r(l, e);
      if (!g) {
        return;
      }
      var m = i(g, t);
      if (!m) {
        return;
      }
      m = v ? a(m) : o(m);
      var E, T, y;
      if (v && s(m, p)) {
        var I = l.languageService.getProgram()?.getTypeChecker();
        var h = u(m, I);
        y = h && c.multi[h] ? c.multi[h]?.schema : c.current?.schema;
        var S = getToken(m.arguments[0], t);
        if (!y || !S) {
          return;
        }
        T = m.arguments[0].getText();
        E = new Cursor(S.line, S.start - 1);
      } else if (!v && d(m)) {
        var b = getToken(m.template, t);
        if (!b || !c.current) {
          return;
        }
        var {combinedText: N, resolvedSpans: D} = f(m, e, l);
        var A = D.filter(e => e.original.start < t && e.original.start + e.original.length < t).reduce((e, t) => e + (t.lines - 1), 0);
        b.line = b.line + A;
        T = N;
        E = new Cursor(b.line, b.start - 1);
        y = c.current.schema;
      } else {
        return;
      }
      var F = getHoverInformation(y, T, E);
      return {
        kind: n.ScriptElementKind.label,
        textSpan: {
          start: t,
          length: 1
        },
        kindModifiers: "text",
        documentation: Array.isArray(F) ? F.map(e => ({
          kind: "text",
          text: e
        })) : [ {
          kind: "text",
          text: F
        } ]
      };
    }(c, v, l, e));
    if (p) {
      return p;
    }
    return e.languageService.getQuickInfoAtPosition(...t);
  };
  logger("proxy: " + JSON.stringify(c));
  return c;
}

var init = e => {
  v(e);
  return {
    create
  };
};

export { init as default };
//# sourceMappingURL=graphqlsp.mjs.map
