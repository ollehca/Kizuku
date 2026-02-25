/**
 * Kizuku Team System Quarantine
 *
 * Disables PenPot's team/auth checks for single-user mode (private license).
 * Preserves code for future business/collab mode (cloud-based).
 *
 * CRITICAL: This runs BEFORE PenPot's app initializes
 */

console.log('🔧 [KIZUKU] Loading team system quarantine...');

/** @type {object} Synthetic permissions for single-user mode */
const SINGLE_USER_PERMS = {
  'can-edit': true,
  'can-read': true,
  'is-owner': true,
  'is-admin': true,
};

/**
 * Get RxJS core from beicon if available
 * @returns {object|null} beicon rx core or null
 */
function getRxCore() {
  if (window.beicon?.v2?.core) {
    return window.beicon.v2.core;
  }
  return null;
}

/**
 * Quarantine team initialization (team.cljs)
 * @param {object} teamModule - PenPot team module
 */
function quarantineTeamInit(teamModule) {
  if (teamModule.team_initialized) {
    teamModule.team_initialized = (teamId) => {
      console.log('🔐 [KIZUKU] Intercepting team-initialized:', teamId);
      return {
        watch: (_evt, _state, _stream) => {
          const rx = getRxCore();
          if (rx) {
            return rx.of((s) => Object.assign({}, s, { permissions: SINGLE_USER_PERMS }));
          }
          return [];
        },
        effect: (_evt2, _state2, _stream2) => {
          const storage = window.app?.main?.util?.storage?.global;
          if (storage?.swap) {
            storage.swap((s) => {
              s['app.main.data.team/current-team-id'] = teamId;
              return s;
            });
          }
        },
      };
    };
    console.log('✅ [KIZUKU] Quarantined team.team_initialized');
  }

  if (teamModule.fetch_teams) {
    teamModule.fetch_teams = () => ({
      watch: (_a, _b, _c) => {
        const rx = getRxCore();
        return rx ? rx.empty() : [];
      },
    });
    console.log('✅ [KIZUKU] Quarantined team.fetch_teams');
  }
}

/**
 * Quarantine auth module (auth.cljs)
 * @param {object} authModule - PenPot auth module
 */
function quarantineAuthModule(authModule) {
  const originalLoggedIn = authModule.logged_in;
  if (!originalLoggedIn) {
    return;
  }
  authModule.logged_in = function () {
    const token = localStorage.getItem('auth-token');
    if (token) {
      return true;
    }
    return originalLoggedIn.apply(this, arguments);
  };
  console.log('✅ [KIZUKU] Quarantined auth.logged_in');
}

/**
 * Intercept a single RPC command if it matches
 * @param {string} cmdName - Command name
 * @returns {object|null} Intercepted result or null
 */
function interceptRpcCommand(cmdName) {
  const rx = getRxCore();

  if (cmdName === ':get-teams' || cmdName === 'get-teams') {
    console.log('🔐 [KIZUKU] Intercepting RPC :get-teams');
    return rx ? rx.of([]) : Promise.resolve([]);
  }

  if (cmdName === ':get-profile' || cmdName === 'get-profile') {
    const profile = localStorage.getItem('auth-profile');
    if (profile) {
      console.log('🔐 [KIZUKU] Intercepting RPC :get-profile');
      const data = JSON.parse(profile);
      return rx ? rx.of(data) : Promise.resolve(data);
    }
  }

  return null;
}

/**
 * Quarantine RPC commands (repo.cljs)
 * @param {object} repoModule - PenPot repo module
 */
function quarantineRepoCommands(repoModule) {
  const originalCmd = repoModule.cmd;
  if (!originalCmd) {
    return;
  }
  repoModule.cmd = function (cmdName, _params) {
    const intercepted = interceptRpcCommand(cmdName);
    if (intercepted) {
      return intercepted;
    }
    return originalCmd.apply(this, arguments);
  };
  console.log('✅ [KIZUKU] Quarantined repo.cmd (RPC interception)');
}

// Wait for PenPot's app to be available
const waitForPenPot = setInterval(() => {
  if (!window.app?.main?.data) {
    return;
  }

  const singleUserMode = window.KIZUKU_SINGLE_USER_MODE === true;
  if (!singleUserMode) {
    console.log('🚩 [KIZUKU] Not in single-user mode, skipping team quarantine');
    clearInterval(waitForPenPot);
    return;
  }

  clearInterval(waitForPenPot);
  console.log('✅ [KIZUKU] PenPot app detected, applying team quarantine...');

  try {
    if (window.app.main.data.team) {
      quarantineTeamInit(window.app.main.data.team);
    }
    if (window.app.main.data.auth) {
      quarantineAuthModule(window.app.main.data.auth);
    }
    if (window.app.main.repo) {
      quarantineRepoCommands(window.app.main.repo);
    }
    console.log('✅ [KIZUKU] Team quarantine complete');
  } catch (error) {
    console.error('❌ [KIZUKU] Failed to apply team quarantine:', error);
  }
}, 100);

// Timeout after 30 seconds
setTimeout(() => {
  clearInterval(waitForPenPot);
  console.log('⏱️ [KIZUKU] Stopped waiting for PenPot app');
}, 30000);
