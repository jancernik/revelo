import { jest } from "@jest/globals"
import { randomUUID } from "node:crypto"
import { setTimeout } from "node:timers/promises"

import { withAdvisoryLock } from "#src/database.js"

function deferred() {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe("Postgres advisory locks", () => {
  it("excludes a concurrent task and releases the lock when the connection closes", async () => {
    const name = `dependency-test-${randomUUID()}`
    const entered = deferred()
    const release = deferred()
    const first = withAdvisoryLock(name, async () => {
      entered.resolve()
      await release.promise
      return "first"
    })

    try {
      await entered.promise
      const task = jest.fn()
      await expect(withAdvisoryLock(name, task)).resolves.toEqual({ acquired: false })
      expect(task).not.toHaveBeenCalled()
    } finally {
      release.resolve()
      await first
    }

    await expect(withAdvisoryLock(name, async () => "next")).resolves.toEqual({
      acquired: true,
      value: "next"
    })
  })

  it("waits for a held lock before running a waiting task", async () => {
    const name = `dependency-test-${randomUUID()}`
    const entered = deferred()
    const release = deferred()
    const order = []
    const first = withAdvisoryLock(name, async () => {
      entered.resolve()
      await release.promise
      order.push("first")
    })
    let second

    try {
      await entered.promise
      second = withAdvisoryLock(
        name,
        async () => {
          order.push("second")
          return "waited"
        },
        { wait: true }
      )
      await expect(Promise.race([second, setTimeout(50, "waiting")])).resolves.toBe("waiting")
      expect(order).toEqual([])
    } finally {
      release.resolve()
      await first
    }

    await expect(second).resolves.toEqual({ acquired: true, value: "waited" })
    expect(order).toEqual(["first", "second"])
  })

  it("releases the lock after a failed task", async () => {
    const name = `dependency-test-${randomUUID()}`
    const error = new Error("task failed")
    await expect(
      withAdvisoryLock(name, async () => {
        throw error
      })
    ).rejects.toBe(error)

    await expect(withAdvisoryLock(name, async () => "recovered")).resolves.toEqual({
      acquired: true,
      value: "recovered"
    })
  })
})
