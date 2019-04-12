class PinnedTabsContainer extends AbstractTabContainer {

    init() {
        super.init()

        this.element.addEventListener('drop', (e) => {
             if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
           let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'

            e.currentTarget.classList.remove('tab-dragged-over')
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
                        windowId: ContainerTabsSidebar.WINDOW_ID,
                        index: index
                    })
                })
            } else {
                browser.tabs.move(tabId, {
                    windowId: ContainerTabsSidebar.WINDOW_ID,
                    index: index
                })
            }
        })

        this.element.addEventListener('dragover', (e) => {
            if (!e.dataTransfer.types.includes('tab/move')) {
                return
            }
            e.preventDefault()
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('tab/move').split('/')
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('tab-dragged-over')
            return false
        })

        this.element.addEventListener('drop', (e) => {
             if (!e.dataTransfer.types.includes('container/move')) {
                return
            }
			e.currentTarget.classList.remove('container-dragged-over')
			let containers = document.getElementById('containers')
			let sourceElnt = containers.getElementsByClassName('container-hdr-dragged')[0]
			sourceElnt.classList.remove('container-hdr-dragged')

			// Skip moving the first container in the first position
			if (containers.firstChild == sourceElnt)
				return

			const oldChild = containers.removeChild(sourceElnt);
			containers.insertBefore(oldChild, containers.firstChild);

        })

        this.element.addEventListener('dragover', (e) => {
            if (!e.dataTransfer.types.includes('container/move')) {
                return
            }
			e.preventDefault()
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
        if (updateTabs) {
            browser.tabs.query({
                currentWindow: true,
                pinned: true
            }).then((res) => {
                this.renderTabs(this.element, res)
            })
        }
    }
}
