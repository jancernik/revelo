export class FilteredLogger {
  constructor(suppressedStrings = [], writer = console) {
    this.suppressedStrings = suppressedStrings
    this.writer = writer
  }

  logQuery(query, params) {
    const shouldSuppress = this.suppressedStrings.some((string) => query.includes(string))
    if (shouldSuppress) return

    const stringifiedParams = params.map((p) => {
      try {
        return JSON.stringify(p)
      } catch {
        return String(p)
      }
    })

    const paramsStr = stringifiedParams.length
      ? ` -- params: [${stringifiedParams.join(", ")}]`
      : ""

    this.writer.log(`Query: ${query}${paramsStr}`)
  }
}
