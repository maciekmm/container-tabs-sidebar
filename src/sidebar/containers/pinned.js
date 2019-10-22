import AbstractTabContainer from './container.js'

export default class PinnedTabsContainer extends AbstractTabContainer {

    init() {
        super.init()
        
        this.element.addEventListener('drop', (e) => {
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'

            e.currentTarget.classList.remove('container-dragged-over')
            let index = -1
            if(this.tabs.size > 0) {
                index = this.tabs.values().next().value.tab.index
            }

            //if moved from pinned container
            if(!pinned) {
                browser.tabs.update(tabId, {
                    pinned: true,
                }).then(() => {
                    browser.tabs.move(tabId, {
                        windowId: this._window.id,
                        index: index
                    })
                })
            } else {
                browser.tabs.move(tabId, {
                    windowId: this._window.id,
                    index: index
                })
            }
        })

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault()
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('container-dragged-over')
            return false
        })
    }

    _handleTabCreated(newTab) {
        if(!newTab.pinned) return
        super._handleTabCreated(newTab)
    }

    _handleTabPinned(tabId, change, tab) {
        if(!tab.pinned) {
            this.removeTab(tabId)
        } else {
            this.render(true)
        }
    }

    render(updateTabs) {
        super.render(updateTabs)
        if (updateTabs) {
            browser.tabs.query({
                currentWindow: true,
                pinned: true
            }).then((res) => {
                this.renderTabs(this.element, res)
                this.render(false)
            })
        }
    }
}