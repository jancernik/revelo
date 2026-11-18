import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useDashboardLayout } from "#src/composables/useDashboardLayout"
import { failure, success } from "#src/stores/test/helpers"
import api from "#src/utils/api"
import Tasks from "#src/views/dashboard/Tasks.vue"

const toast = vi.hoisted(() => vi.fn())
vi.mock("#src/composables/useToast", () => ({ useToast: () => ({ show: toast }) }))
vi.mock("#src/utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#src/utils/api")>()),
  default: { post: vi.fn() }
}))
enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.resetAllMocks()
  useDashboardLayout().reset()
})

const cases = [
  {
    button: "Cleanup Staged Images",
    description: "Deleted: 3\nErrors: 1\nScanned: 5",
    endpoint: "/tasks/cleanup/images/staged",
    failureTitle: "Cleanup Failed",
    fallback: "Failed to clean up temporary images.",
    initiated: "Cleanup Initiated",
    result: { deleted: 3, errors: 1, scanned: 5 },
    title: "Cleanup Staged Successful"
  },
  {
    button: "Cleanup Orphaned Images",
    description: "Deleted: 3\nErrors: 1\nScanned: 5",
    endpoint: "/tasks/cleanup/images/orphaned",
    failureTitle: "Cleanup Failed",
    fallback: "Failed to clean up orphaned images.",
    initiated: "Cleanup Initiated",
    result: { deleted: 3, errors: 1, scanned: 5 },
    title: "Cleanup Orphaned Successful"
  },
  {
    button: "Backfill Embeddings",
    description: "Successful: 3\nErrors: 1\nScanned: 5",
    endpoint: "/tasks/backfill/embeddings",
    failureTitle: "Failed to backfill embeddings",
    fallback: "Failed to backfill embeddings.",
    initiated: "Backfill Initiated",
    result: { errors: 1, scanned: 5, successful: 3 },
    title: "Embedding Backfill Successful"
  },
  {
    button: "Backfill Descriptions",
    description: "Successful: 3\nErrors: 1\nScanned: 5",
    endpoint: "/tasks/backfill/captions",
    failureTitle: "Failed to backfill descriptions",
    fallback: "Failed to backfill descriptions.",
    initiated: "Backfill Initiated",
    result: { errors: 1, scanned: 5, successful: 3 },
    title: "Description Backfill Successful"
  }
] as const

const click = async (label: string) => {
  const wrapper = mount(Tasks, { global: { stubs: { Icon: true } } })
  const button = wrapper.findAll("button").find((item) => item.text() === label)
  if (!button) throw new Error(`Missing task button ${label}`)
  await button.trigger("click")
  await flushPromises()
  return wrapper
}

describe("Tasks", () => {
  it("registers its header and resets only the header on unmount", () => {
    useDashboardLayout().setFooter({ actions: [{ onClick: vi.fn(), text: "Retained" }] })
    const wrapper = mount(Tasks, { global: { stubs: { Icon: true } } })
    expect(useDashboardLayout().header.title).toBe("Tasks")
    wrapper.unmount()
    expect(useDashboardLayout().header.title).toBeNull()
    expect(useDashboardLayout().footer.actions[0]?.text).toBe("Retained")
  })

  for (const task of cases) {
    it(`runs ${task.button} and reports its result after the initiation toast`, async () => {
      vi.mocked(api.post).mockResolvedValue(success({ result: task.result }))
      await click(task.button)
      expect(api.post).toHaveBeenCalledExactlyOnceWith(task.endpoint)
      expect(toast.mock.calls).toEqual([
        [{ dismissible: false, title: task.initiated, type: "info" }],
        [{ description: task.description, title: task.title, type: "success" }]
      ])
    })

    it(`shows the server error for ${task.button}`, async () => {
      vi.mocked(api.post).mockRejectedValue(failure("transport", "Server message"))
      await click(task.button)
      expect(toast).toHaveBeenLastCalledWith({
        description: "Server message",
        title: task.failureTitle,
        type: "error"
      })
      expect(toast).toHaveBeenCalledTimes(2)
    })

    it(`retains the fallback for an empty error message from ${task.button}`, async () => {
      vi.mocked(api.post).mockRejectedValue(new Error(""))
      await click(task.button)
      expect(toast).toHaveBeenLastCalledWith({
        description: task.fallback,
        title: task.failureTitle,
        type: "error"
      })
    })

    it(`retains missing-result interpolation for ${task.button}`, async () => {
      vi.mocked(api.post).mockResolvedValue(success({}))
      await click(task.button)
      expect(toast).toHaveBeenLastCalledWith({
        description: task.description.replaceAll(/\b[135]\b/g, "undefined"),
        title: task.title,
        type: "success"
      })
    })
  }
})
