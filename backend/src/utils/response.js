export function ok(data = {}, msg = "ok") {
  return { code: 0, msg, data };
}

export function fail(code, msg, data = {}) {
  return { code, msg, data };
}
