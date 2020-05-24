var tid;
function scheduleSortTabs() {
    if(!!tid) clearTimeout(tid)
    tid = setTimeout(sortTabs, 2000)
}

async function getDesiredTabsOrder() {
    let tabs = await browser.tabs.query({ currentWindow: true, pinned: false })
    let contextualIdentitites = (await browser.contextualIdentities.query({})).map(ctx => ctx.cookieStoreId)

    let comparator = (tab1, tab2) => {
        let tab1CI = contextualIdentitites.indexOf(tab1.cookieStoreId)
        let tab2CI = contextualIdentitites.indexOf(tab2.cookieStoreId)
        if(tab1CI !== tab2CI) {
            return tab1CI - tab2CI
        }
        return tab1.index - tab2.index
    }

    let sorted = tabs.slice(1).every((item, i) => comparator(tabs[i], item) <= 0);
    if(!sorted) {
        tabs.sort(comparator)
    }
    return {tabs: tabs, sorted: sorted}
}

async function sortTabs() {
    let {tabs, sorted} = await getDesiredTabsOrder()
    if(sorted) return
    await browser.tabs.move(tabs.map(tab => tab.id), {index: -1})
}

export function enable() {
    browser.tabs.onCreated.addListener(scheduleSortTabs)
    browser.tabs.onMoved.addListener(scheduleSortTabs)
    browser.tabs.onAttached.addListener(scheduleSortTabs)

    sortTabs()
}