export function diagnostic(code, message, severity, location = {}) {
    return { code, message, severity, ...location };
}
