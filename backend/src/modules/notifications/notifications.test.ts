import { prisma } from "../../config/prisma";
import { notify } from "./notifications.service";
import { api, bearer, createElection, createUser, waitFor } from "../../../tests/helpers";

describe("notifications", () => {
  it("lists own notifications with unreadOnly true/false, rejects bad values, marks read", async () => {
    const m = await createUser("MEMBER");
    const other = await createUser("MEMBER");
    await notify([m.id], { type: "SYSTEM_ALERT", title: "One", message: "First" });
    await notify([m.id], { type: "SYSTEM_ALERT", title: "Two", message: "Second" });
    await notify([other.id], { type: "SYSTEM_ALERT", title: "Theirs", message: "Not yours" });

    const all = await api().get("/api/v1/notifications").set(bearer(m));
    expect(all.body.data.notifications).toHaveLength(2);
    const first = all.body.data.notifications[0].id;

    expect((await api().patch(`/api/v1/notifications/${first}/read`).set(bearer(m))).status).toBe(200);
    expect((await api().get("/api/v1/notifications?unreadOnly=true").set(bearer(m))).body.data.notifications).toHaveLength(1);
    expect((await api().get("/api/v1/notifications?unreadOnly=false").set(bearer(m))).body.data.notifications).toHaveLength(2);
    expect((await api().get("/api/v1/notifications?unreadOnly=maybe").set(bearer(m))).status).toBe(422);

    const theirs = await prisma.notification.findFirstOrThrow({ where: { userId: other.id } });
    expect((await api().patch(`/api/v1/notifications/${theirs.id}/read`).set(bearer(m))).status).toBe(403);

    expect((await api().patch("/api/v1/notifications/read-all").set(bearer(m))).status).toBe(200);
    expect((await api().get("/api/v1/notifications?unreadOnly=true").set(bearer(m))).body.data.notifications).toHaveLength(0);
    expect(await prisma.notification.count({ where: { userId: other.id, read: false } })).toBe(1);
  });

  it("activation notifies active members only, after the DAT transaction commits", async () => {
    const [o1, o2, o3] = [await createUser("ELECTION_OFFICER"), await createUser("ELECTION_OFFICER"), await createUser("ELECTION_OFFICER")];
    const active = await createUser("MEMBER");
    const suspended = await createUser("MEMBER", { status: "SUSPENDED" });
    const e = await createElection(o1.id, { status: "APPROVED" });
    const req = await api().post(`/api/v1/elections/${e.id}/activate`).set(bearer(o1));
    await api().post(`/api/v1/approval-requests/${req.body.data.id}/decide`).set(bearer(o2)).send({ decision: "APPROVE" });
    await api().post(`/api/v1/approval-requests/${req.body.data.id}/decide`).set(bearer(o3)).send({ decision: "APPROVE" });

    await waitFor(() => prisma.notification.count({ where: { type: "ELECTION_ACTIVATED" } }), (c) => c > 0);
    expect(await prisma.notification.count({ where: { userId: active.id, type: "ELECTION_ACTIVATED" } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: suspended.id } })).toBe(0);
    expect(await prisma.notification.count({ where: { userId: o2.id, type: "ELECTION_ACTIVATED" } })).toBe(0);
  });
});