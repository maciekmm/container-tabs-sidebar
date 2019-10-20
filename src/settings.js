const CTSOptions = {
    defaults: {
        theme: 'dark',
        containers: {}
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

    //TODO: reactive store
    getConfig: function () {
        return new Promise((resolve, reject) => {
            if ('store' in this) {
                resolve(this.store)
                return
            }
            browser.storage.local.get().then(c => {
                for (let key in this.defaults) {
                    if (!(key in c)) {
                        c[key] = this.defaults[key]
                    }
                }
                this.getSidebarAction().then(action => {
                    c['shortcut'] = action.shortcut
                    resolve(this.store = c)
                }, err => {
                    console.error('error occured while getting sidebar actions', err)
                    resolve(this.store = c)
                })
            })
        })
    }
}
