class ContainerTab {
    constructor(tab, element) {
        this.tab = tab
        this.id = tab.id
        this.element = element
    }

    init() {
        this._createElements()
        this.render()
        browser.tabs.onUpdated.addListener((id, state, tab) => {
            this.tab = tab
            this.render()
        }, {
            tabId: this.id,
            properties: ["title", "favIconUrl"]
        })

        this.element.setAttribute('draggable', true)
        
        this.element.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.id+ '/' + this.tab.cookieStoreId + '/' + this.tab.pinned);
            this.element.classList.add('container-tab-dragged');
        })

        this.element.addEventListener('dragover', (e) => {
            e.preventDefault()
            const [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('text/plain').split('/')
            if((this.tab.cookieStoreId != contextualIdentity && !this.tab.pinned) || !e.currentTarget.hasAttribute("data-tab-id")) {
                e.dataTransfer.dropEffect = 'none'
                return
            }
            e.dataTransfer.dropEffect = 'move'
            e.currentTarget.classList.add('container-tab-dragged-over')
            return false
        })

        this.element.addEventListener('dragleave', (e) => {
            if(!e.target || !e.target.classList) return
            e.target.classList.remove('container-tab-dragged-over')
        })
        this.element.addEventListener('dragend', (e) => {
            if(!e.target || !e.target.classList) return
            e.target.classList.remove('container-tab-dragged-over')
        })

        this.element.addEventListener('drop', (e) => {
            let [tabId, contextualIdentity, pinned] = e.dataTransfer.getData('text/plain').split('/')
            tabId = parseInt(tabId);
            pinned = pinned != 'false'
            if((this.tab.cookieStoreId != contextualIdentity && !this.tab.pinned)) {
                e.dataTransfer.dropEffect = 'none'
                return
            }
            e.target.classList.remove('container-tab-dragged-over')
            if((!this.tab.pinned && pinned) || (this.tab.pinned && !pinned)) {
                browser.tabs.update(tabId, {
                    pinned: !pinned
                }).then((tab) => {
                    browser.tabs.move(tabId, {
                        index: this.tab.index + (!pinned ? 1 : 0)
                    })
                })
            } else {
                browser.tabs.move(tabId, {
                    index: this.tab.index
                })
            }
        })
    }

    destroy() {
        //browser.tabs.onUpdated.removeListener(this.listeners.update)
    }

    _createElements() {
        this.elements = {}
        this.elements.close = document.createElement('span')
        this.elements.close.className = 'container-tab-close'
        this.elements.close.innerText = '✕'
        this.element.appendChild(this.elements.close)
        this.elements.close.addEventListener('click', (e) => {
            e.stopPropagation()
            browser.tabs.remove(this.id)
        })

        this.elements.favicon = document.createElement('img')
        this.elements.favicon.className = 'favicon'
        this.element.appendChild(this.elements.favicon)

        this.elements.title = document.createElement('span')
        this.elements.title.className = 'container-tab-title'
        this.element.appendChild(this.elements.title)

        this.element.addEventListener("click", () => {
            browser.tabs.update(this.id, {
                active: true
            })
        })
    }

    activate() {
        this.tab.active = true
        this.render()
        this.scrollIntoView()
    }

    scrollIntoView() {
        this.element.scrollIntoView({block: "end", behavior: "auto"})
    }

    render() {
        let faviconUrl = this.tab.favIconUrl
        if(!faviconUrl) {
            faviconUrl = ContainerTabsSidebar.FAVICON_FALLBACK
        }
        this.elements.favicon.src = faviconUrl
        this.elements.title.innerText = this.tab.title
        if(this.tab.active) {
            this.element.classList.add('tab-active')
        }
    }
}
