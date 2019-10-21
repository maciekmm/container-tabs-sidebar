const CTSOptions = {
    defaults: {
        theme: 'dark'
    },

    getSidebarAction: function () {
        return new Promise((resolve, reject) => {
            browser.commands.getAll().then(cmds => {
                let filtered = cmds.filter(e => e.name === "_execute_sidebar_action")
                if (filtered.length == 1) {
                    resolve(filtered[0])
                    return
                }
                reject('no actions found')
            })
        })
    },

    getConfig: function () {
        return new Promise((resolve, reject) => {
            browser.storage.local.get().then(c => {
                for (let key in this.defaults) {
                    if (!(key in c)) {
                        c[key] = this.defaults[key]
                    }
                }
                this.getSidebarAction().then(action => {
                    c['shortcut'] = action.shortcut
                    resolve(c)
                }, err => {
                    console.error('error occured while getting sidebar actions', err)
                    resolve(c)
                })
            })
        })
    },

    sessionProxyHandler: function(windowId, sessionStorage) {
        return {
            get: function (obj, key) {
                if (key == 'isProxy') {
                    return true
                }
                let val = obj[key]
                if (typeof val == 'object' && !val.isProxy) {
                    val = new Proxy(val, this)
                }
                return val
            },
            set: function (obj, key, value) {
                obj[key] = value
                browser.sessions.setWindowValue(windowId, 'containers', this.proxyToPOJO(sessionStorage))
                return true
            }.bind(this)
        }
    },

    proxyToPOJO(proxy) {
        let res = {}
        for (let key of Object.keys(proxy)) {
            let val = proxy[key]
            if(typeof val == 'object' && proxy[key].isProxy) {
                res[key] = this.proxyToPOJO(val)
            } else {
                res[key] = val
            }
        }
        return res
    },

    getSessionStorage: async function (window) {
        if (!!this.sessionStorage) {
            return this.sessionStorage
        }
        let storage = await browser.sessions.getWindowValue(window.id, 'containers')
        if (!storage) {
            storage = {}
        }
        return this.sessionStorage = new Proxy(storage, this.sessionProxyHandler(window.id, storage))
    }
}
