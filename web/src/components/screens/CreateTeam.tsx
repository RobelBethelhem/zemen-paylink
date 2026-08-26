"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function CreateTeam() {
  const { modeQuick, modeSeg, modeWizard, on, set, step1, step2, step3, teamBranch, teamBranchD, teamEmail, teamEmailD, teamFullName, teamNameD, teamPhone, teamRole, teamRoleD, w3, w3Last, w3NotLast, wizNotFirst } = useApp();
  return (
    <div data-pad="" style={s("padding:24px 30px;max-width:760px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap")}>
        <button
          className="zxoy0gmr"
          onClick={on.merchTeam}
          style={s("display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid #E7E7EA;background:#fff;border-radius:10px;font-size:13px;font-weight:600;color:#3A3B42;cursor:pointer")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Cancel
        </button>
        <div style={s("flex:1")} />
        <div style={s("font-size:12px;color:#8B8D96;font-weight:500;margin-right:2px")}>Form style</div>
        <div style={s("display:flex;gap:6px;background:#F0F0F2;padding:4px;border-radius:11px")}>
          <button onClick={on.modeWizard} style={modeSeg.wizard}>Guided wizard</button>
          <button onClick={on.modeQuick} style={modeSeg.quick}>Quick form</button>
        </div>
      </div>
      {" "}
      {" "}
      {modeWizard && (
        <>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:16px;box-shadow:0 1px 2px rgba(20,21,25,.04);overflow:hidden")}>
            <div style={s("display:flex;align-items:center;gap:6px;padding:18px 22px;border-bottom:1px solid #F0F0F2")}>
              <div style={s("display:flex;align-items:center;gap:9px;flex:1")}>
                <span>
                  {w3.s1.done && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#DA1E28;color:#fff;display:flex;align-items:center;justify-content:center")}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    </>
                  )}
                  {w3.s1.active && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                        1
                      </span>
                    </>
                  )}
                </span>
                <span style={s("font-size:13px;font-weight:600")}>User details</span>
              </div>
              <span style={s("width:26px;height:2px;background:#EDEDEF")} />
              <div style={s("display:flex;align-items:center;gap:9px;flex:1")}>
                <span>
                  {w3.s2.done && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#DA1E28;color:#fff;display:flex;align-items:center;justify-content:center")}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    </>
                  )}
                  {w3.s2.active && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                        2
                      </span>
                    </>
                  )}
                  {w3.s2.todo && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#F2F2F4;color:#A9ABB3;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                        2
                      </span>
                    </>
                  )}
                </span>
                <span style={s("font-size:13px;font-weight:600")}>Branch & role</span>
              </div>
              <span style={s("width:26px;height:2px;background:#EDEDEF")} />
              <div style={s("display:flex;align-items:center;gap:9px")}>
                <span>
                  {w3.s3.active && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#FDECED;border:1.5px solid #DA1E28;color:#B0141C;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                        3
                      </span>
                    </>
                  )}
                  {w3.s3.todo && (
                    <>
                      <span style={s("width:26px;height:26px;border-radius:50%;background:#F2F2F4;color:#A9ABB3;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:'IBM Plex Mono'")}>
                        3
                      </span>
                    </>
                  )}
                </span>
                <span style={s("font-size:13px;font-weight:600")}>Review</span>
              </div>
            </div>
            <div style={s("padding:24px 22px;min-height:250px")}>
              {step1 && (
                <>
                  <div style={s("animation:fadeIn .3s ease both")}>
                    <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                      Who are you inviting?
                    </div>
                    {" "}
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Full name
                    </label>
                    {" "}
                    <input
                      className="zx20fx8r"
                      onChange={set.teamFullName}
                      placeholder="e.g. Meseret Abebe"
                      value={teamFullName}
                      style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;margin-bottom:16px")}
                    />
                    {" "}
                    <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Email
                        </label>
                        <input
                          className="zx20fx8r"
                          onChange={set.teamEmail}
                          placeholder="name@sheba.et"
                          value={teamEmail}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                        />
                      </div>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Phone
                        </label>
                        <input
                          className="zx20fx8r"
                          onChange={set.teamPhone}
                          placeholder="+251 …"
                          value={teamPhone}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {" "}
              {step2 && (
                <>
                  <div style={s("animation:fadeIn .3s ease both")}>
                    <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:4px")}>
                      Assign a branch & role
                    </div>
                    <div style={s("font-size:13px;color:#8B8D96;margin-bottom:18px")}>
                      Sales users can create links and see payments for their own links.
                    </div>
                    {" "}
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Branch
                    </label>
                    {" "}
                    <select
                      className="zx20fx8r"
                      value={teamBranch}
                      onChange={set.teamBranch}
                      style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;cursor:pointer;margin-bottom:16px")}
                    >
                      <option value="">Select branch…</option>
                      <option>Bole Branch</option>
                      <option>Kazanchis Branch</option>
                      <option>Piassa Branch</option>
                      <option>Megenagna Branch</option>
                    </select>
                    {" "}
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Role
                    </label>
                    {" "}
                    <select
                      className="zx20fx8r"
                      value={teamRole}
                      onChange={set.teamRole}
                      style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;cursor:pointer")}
                    >
                      <option>Sales agent</option>
                      <option>Branch supervisor</option>
                      <option>Branch manager</option>
                    </select>
                  </div>
                </>
              )}
              {" "}
              {step3 && (
                <>
                  <div style={s("animation:fadeIn .3s ease both")}>
                    <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                      Review & invite
                    </div>
                    <div style={s("border:1px solid #EEE;border-radius:13px;overflow:hidden;margin-bottom:14px")}>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Name</span>
                        <span style={s("font-weight:600")}>{teamNameD}</span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Email</span>
                        <span style={s("font-weight:600;font-family:'IBM Plex Mono';font-size:12.5px")}>
                          {teamEmailD}
                        </span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Branch</span>
                        <span style={s("font-weight:600")}>{teamBranchD}</span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Role</span>
                        <span style={s("font-weight:600")}>{teamRoleD}</span>
                      </div>
                    </div>
                    <div style={s("display:flex;align-items:center;gap:11px;background:#FDECED;border-radius:12px;padding:13px 15px")}>
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#B0141C"
                        strokeWidth="1.8"
                        style={s("flex-shrink:0")}
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-10 5L2 7" />
                      </svg>
                      <span style={s("font-size:12.5px;color:#B0141C")}>
                        An invite email will be sent for the user to set their password and enable 2-factor sign-in.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={s("display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-top:1px solid #F0F0F2;background:#FAFAFB")}>
              {wizNotFirst && (
                <>
                  <button
                    className="zxoy0gmr"
                    onClick={on.wizBack}
                    style={s("display:flex;align-items:center;gap:7px;padding:11px 18px;border:1px solid #E3E3E6;background:#fff;border-radius:11px;font-size:13.5px;font-weight:600;color:#3A3B42;cursor:pointer")}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Back
                  </button>
                </>
              )}
              {step1 && (
                <>
                  <span />
                </>
              )}
              {w3NotLast && (
                <>
                  <button
                    className="zx15p5ni"
                    onClick={on.wizNext}
                    style={s("display:flex;align-items:center;gap:8px;padding:11px 22px;border:none;background:#141519;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer")}
                  >
                    Continue
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}
              {w3Last && (
                <>
                  <button
                    className="zxvmr3xp"
                    onClick={on.createTeamDone}
                    style={s("display:flex;align-items:center;gap:9px;padding:11px 24px;border:none;background:#DA1E28;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3)")}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-10 5L2 7" />
                    </svg>
                    Send invite
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {" "}
      {" "}
      {modeQuick && (
        <>
          <div style={s("background:#fff;border:1px solid #ECECEE;border-radius:16px;box-shadow:0 1px 2px rgba(20,21,25,.04);padding:24px 22px")}>
            <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
              Invite sales user
            </div>
            {" "}
            <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
              Full name
            </label>
            {" "}
            <input
              className="zx20fx8r"
              onChange={set.teamFullName}
              placeholder="e.g. Meseret Abebe"
              value={teamFullName}
              style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;margin-bottom:14px")}
            />
            {" "}
            <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px")}>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Email
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.teamEmail}
                  placeholder="name@sheba.et"
                  value={teamEmail}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                />
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Phone
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.teamPhone}
                  placeholder="+251 …"
                  value={teamPhone}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                />
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Branch
                </label>
                <select
                  className="zx20fx8r"
                  value={teamBranch}
                  onChange={set.teamBranch}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;cursor:pointer")}
                >
                  <option value="">Select branch…</option>
                  <option>Bole Branch</option>
                  <option>Kazanchis Branch</option>
                  <option>Piassa Branch</option>
                  <option>Megenagna Branch</option>
                </select>
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Role
                </label>
                <select
                  className="zx20fx8r"
                  value={teamRole}
                  onChange={set.teamRole}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;cursor:pointer")}
                >
                  <option>Sales agent</option>
                  <option>Branch supervisor</option>
                  <option>Branch manager</option>
                </select>
              </div>
            </div>
            {" "}
            <button
              className="zxvmr3xp"
              onClick={on.createTeamDone}
              style={s("width:100%;display:flex;align-items:center;justify-content:center;gap:9px;padding:14px;border:none;background:#DA1E28;color:#fff;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3);margin-top:6px")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
              Send invite
            </button>
          </div>
        </>
      )}
    </div>
  );
}
