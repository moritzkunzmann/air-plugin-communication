const {Builder, By, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// const assert = require('assert');
const assert = require('chai').assert;

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Some tests need to access the MINERVA proxy to, e.g., check which elements are highlighted. However, the tests
// do not run in the same scope as the plugin and thus they do not have access to the Proxy. Therefore, the plugin
// exposes the proxy by attaching it as a data attribute to the main div element.
const minervaProxyCode = "$('.starter-kit-container').data('minervaProxy')";


function minervaLogin() {

    const xhr = new XMLHttpRequest();

    return new Promise(function (resolve, reject) {

        xhr.onreadystatechange = function () {

            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.open("POST", 'http://localhost:8080/minerva/api/doLogin', false);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send("login=admin&password=admin");
    });
}

async function getRequest(uri) {

    const xhr = new XMLHttpRequest();

    return new Promise(function (resolve, reject) {

        xhr.onreadystatechange = function () {

            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.open("GET", uri);
        xhr.send();
    });
}

describe('Starter kit', async function() {

    //Some functions can take a lot of time as they need, for isntance, start MINERVA interface
    this.timeout(20000);

    let driver;
    let minervaProxy;
    let pluginContainer;

    function deHighlightAll(){
        return driver.executeScript(`minervaProxy = ${minervaProxyCode}; minervaProxy.project.map.getHighlightedBioEntities().then( highlighted => minervaProxy.project.map.hideBioEntity(highlighted) )`);
    }

    before(async function startWebDriver() {
        const opts = new chrome.Options().addArguments('--no-sandbox', '--headless', '--remote-debugging-port=9222');
        driver = await new Builder().setChromeOptions(opts).forBrowser('chrome').build();
        // driver = await new Builder().forBrowser('chrome').build();

        await driver.manage().window().maximize();

        const loginResponse = await minervaLogin();
        const minervaToken = JSON.parse(loginResponse.responseText).token;

        await driver.get('http://localhost:8080');
        await driver.manage().addCookie({name: 'MINERVA_AUTH_TOKEN', value: minervaToken});
        const pluginsResponse = await getRequest('http://localhost:8080/minerva/api/plugins/');
        const pluginHash = JSON.parse(pluginsResponse.responseText)[0].hash;

        await driver.get(`http://localhost:8080/minerva/index.xhtml?id=single-map&plugins=${pluginHash}`);

        pluginContainer = await driver.wait(until.elementLocated(By.css('.starter-kit-container')),10000);
        minervaProxy = await driver.executeScript("return $('.starter-kit-container').data('minervaProxy')");
    });

    after(async function finishWebDriver() {
        await driver.quit();
    });

    describe('Plugin components', function () {

        async function fillNOX1(){
            // let focusButton = driver.findElement(By.className('btn-focus'));
            // let focusButton = await driver.wait(until.elementLocated(By.css('.btn-focus')),10000);

            let searchInput = driver.findElement(By.css('.minerva-generic-search-panel .searchPanel input[name="searchInput"]'));
            let searchSubmit = driver.findElement(By.css('.minerva-generic-search-panel .searchPanel .minerva-search-button'));

            await searchInput.sendKeys('NOX1');
            searchSubmit.click();

            const eventsDiv = await driver.wait(until.elementLocated(By.css('.starter-kit-container .panel .card-body div')),10000);
            return eventsDiv;
        }

        describe('#focus', function () {
            it('should exist', async function () {

                const eventsDiv = await fillNOX1();
                eventText = await eventsDiv.getText();
                assert.equal(eventText, 'NOX1 - sa6');
            })
        });

        describe('#highlight', function () {
            it('should highlight bioentity', async function () {

                // await fillNOX1();

                const highlightBtn = await pluginContainer.findElement(By.css('.btn-highlight'));
                highlightBtn.click();
                await driver.sleep(1000);

                await driver.executeAsyncScript(`
                    var callback = arguments[arguments.length - 1];
                    ${minervaProxyCode}.project.map.getHighlightedBioEntities().then(highlighted => callback(highlighted));                    
                `).then(function (highlighted){
                    assert.equal(highlighted.length, 1);
                });
            })
        });

        //The following test needs to be rewritten so that it ensures that the random selection is different from the last selection
        describe.skip('#random', function () {
            before(async function () {

                await deHighlightAll();

                const btnPickRandom = await pluginContainer.findElement(By.css('.btn-pick-random'));
                btnPickRandom.click();
                await driver.sleep(1000);
            });

            it('should focus', async function () {

                const urlBefore = await driver.getCurrentUrl();

                const btn = await pluginContainer.findElement(By.css('.btn-focus-random'));
                btn.click();
                await driver.sleep(1000);

                const urlAfter = await driver.getCurrentUrl();

                assert.notEqual(urlBefore, urlAfter);
            });

            it('should highlight bioentity', async function () {

                const highlightBtn = await pluginContainer.findElement(By.css('.btn-highlight-random'));
                highlightBtn.click();
                await driver.sleep(1000);

                const highlighted = await driver.executeScript(`return ${minervaProxyCode}.project.map.getHighlightedBioEntities()`);

                assert.equal(highlighted.length, 1);
            });
        });

        describe('#uniprot', function () {
            it('should return something', async function () {

                const btn = await pluginContainer.findElement(By.css('.btn-uniprot'));
                btn.click();

                const uniprotCodeElement = await pluginContainer.findElement(By.css('.panel-uniprot code'));
                try {
                    await driver.wait(until.elementTextContains(uniprotCodeElement, 'Entry'),10000);
                }
                catch(e){
                    if (e.name !== 'TimeoutError')
                        throw e;
                }

                const uniprotText = await uniprotCodeElement.getText();

                assert.equal(uniprotText.indexOf('Entry') >= 0, true);
            })
        });

        describe('#minerva api', function () {
            it('should return elements', async function () {

                const btn = await pluginContainer.findElement(By.css('.btn-minerva'));
                btn.click();

                const contentElm = await pluginContainer.findElement(By.css('.panel-minerva .card-body'));
                try {
                    await driver.wait(until.elementTextContains(contentElm, 's6'),10000);
                }
                catch(e){
                    if (e.name !== 'TimeoutError')
                        throw e;
                }

                const content = await contentElm.getText();

                assert.equal(content.length > 0, true);
            })
        });
    })
});