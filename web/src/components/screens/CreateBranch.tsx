"use client";

import { s } from "@/lib/css";
import { useApp } from "@/store/AppProvider";

export function CreateBranch() {
  const { branchArea, branchAreaD, branchCity, branchCityD, branchCode, branchCodeD, branchMgr, branchMgrD, branchMgrEmail, branchMgrPhone, branchName, branchNameD, modeQuick, modeSeg, modeWizard, on, set, step1, step2, step3, w3, w3Last, w3NotLast, wizNotFirst } = useApp();
  return (
    <div data-pad="" style={s("padding:24px 30px;max-width:760px;margin:0 auto;animation:fadeUp .45s ease both")}>
      <div style={s("display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap")}>
        <button
          className="zxoy0gmr"
          onClick={on.merchBranches}
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
                <span style={s("font-size:13px;font-weight:600")}>Branch details</span>
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
                <span style={s("font-size:13px;font-weight:600")}>Manager</span>
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
                      Where is this branch?
                    </div>
                    <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px")}>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Branch name
                        </label>
                        <input
                          className="zx20fx8r"
                          onChange={set.branchName}
                          placeholder="e.g. Bole Branch"
                          value={branchName}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                        />
                      </div>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Branch code
                        </label>
                        <input
                          className="zx20fx8r"
                          onChange={set.branchCode}
                          placeholder="Auto-generated"
                          value={branchCode}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;font-family:'IBM Plex Mono'")}
                        />
                      </div>
                    </div>
                    <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px")}>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          City
                        </label>
                        <select
                          className="zx20fx8r"
                          value={branchCity}
                          onChange={set.branchCity}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;cursor:pointer")}
                        >
                          <option value="">Select city…</option>
                          <option>Addis Ababa</option>
                          <option>Adama</option>
                          <option>Bahir Dar</option>
                          <option>Hawassa</option>
                          <option>Dire Dawa</option>
                          <option>Mekelle</option>
                          <option>Gondar</option>
                        </select>
                      </div>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Sub-city / area
                        </label>
                        <input
                          className="zx20fx8r"
                          onChange={set.branchArea}
                          placeholder="e.g. Bole, near Edna Mall"
                          value={branchArea}
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
                      Who manages this branch?
                    </div>
                    <div style={s("font-size:13px;color:#8B8D96;margin-bottom:18px")}>
                      The manager oversees sales users and links for this location.
                    </div>
                    {" "}
                    <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                      Manager full name
                    </label>
                    {" "}
                    <input
                      className="zx20fx8r"
                      onChange={set.branchMgr}
                      placeholder="e.g. Yonas Kebede"
                      value={branchMgr}
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
                          onChange={set.branchMgrEmail}
                          placeholder="manager@sheba.et"
                          value={branchMgrEmail}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                        />
                      </div>
                      <div>
                        <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                          Phone
                        </label>
                        <input
                          className="zx20fx8r"
                          onChange={set.branchMgrPhone}
                          placeholder="+251 …"
                          value={branchMgrPhone}
                          style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {" "}
              {step3 && (
                <>
                  <div style={s("animation:fadeIn .3s ease both")}>
                    <div style={s("font-family:'Space Grotesk';font-weight:600;font-size:16px;margin-bottom:18px")}>
                      Review & create
                    </div>
                    <div style={s("border:1px solid #EEE;border-radius:13px;overflow:hidden")}>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Branch name</span>
                        <span style={s("font-weight:600")}>{branchNameD}</span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Code</span>
                        <span style={s("font-weight:600;font-family:'IBM Plex Mono'")}>{branchCodeD}</span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>City</span>
                        <span style={s("font-weight:600")}>{branchCityD}</span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #F2F2F4;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Area</span>
                        <span style={s("font-weight:600")}>{branchAreaD}</span>
                      </div>
                      <div style={s("display:flex;justify-content:space-between;padding:13px 16px;font-size:13.5px")}>
                        <span style={s("color:#8B8D96")}>Manager</span>
                        <span style={s("font-weight:600")}>{branchMgrD}</span>
                      </div>
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
                    onClick={on.createBranchDone}
                    style={s("display:flex;align-items:center;gap:9px;padding:11px 24px;border:none;background:#DA1E28;color:#fff;border-radius:11px;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3)")}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create branch
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
              New branch
            </div>
            <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px")}>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Branch name
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.branchName}
                  placeholder="e.g. Bole Branch"
                  value={branchName}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                />
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Branch code
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.branchCode}
                  placeholder="Auto-generated"
                  value={branchCode}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;font-family:'IBM Plex Mono'")}
                />
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  City
                </label>
                <select
                  className="zx20fx8r"
                  value={branchCity}
                  onChange={set.branchCity}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px;background:#fff;cursor:pointer")}
                >
                  <option value="">Select city…</option>
                  <option>Addis Ababa</option>
                  <option>Adama</option>
                  <option>Bahir Dar</option>
                  <option>Hawassa</option>
                  <option>Dire Dawa</option>
                  <option>Mekelle</option>
                  <option>Gondar</option>
                </select>
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Sub-city / area
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.branchArea}
                  placeholder="e.g. Bole"
                  value={branchArea}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                />
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Manager name
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.branchMgr}
                  placeholder="e.g. Yonas Kebede"
                  value={branchMgr}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                />
              </div>
              <div>
                <label style={s("display:block;font-size:12.5px;font-weight:600;color:#3A3B42;margin-bottom:7px")}>
                  Manager email
                </label>
                <input
                  className="zx20fx8r"
                  onChange={set.branchMgrEmail}
                  placeholder="manager@sheba.et"
                  value={branchMgrEmail}
                  style={s("width:100%;padding:12px 15px;border:1px solid #E3E3E6;border-radius:11px;font-size:14px")}
                />
              </div>
            </div>
            {" "}
            <button
              className="zxvmr3xp"
              onClick={on.createBranchDone}
              style={s("width:100%;display:flex;align-items:center;justify-content:center;gap:9px;padding:14px;border:none;background:#DA1E28;color:#fff;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;box-shadow:0 8px 20px rgba(218,30,40,.3);margin-top:6px")}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create branch
            </button>
          </div>
        </>
      )}
    </div>
  );
}
