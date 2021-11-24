/**
 * 严选心愿城
 * 变量格式为 export xinghe_yx_xyc='{"csrf_token":"抓包csrf_token","cookie":"抓包cookie"}'
 * 抓包https://act.you.163.com/act/napi    
 * csrf_token在链接，cookie在请求体头部   
 * cron 	0 */15 * * * *
 */
const $ = new Env('严选心愿城');
const YX_API_HOST = 'https://act.you.163.com/act/napi/fairyland';
const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 yanxuan/6.7.7 app-chan-id/AppStore'
// 此处填写cookie和csrf_token，暂时只支持青龙
let xinghe_yx_xyc;
try {
    xinghe_yx_xyc = JSON.parse(xinghe_yx_xyc || process.env.xinghe_yx_xyc);
} catch (error) {
    console.log('cookie格式填写错误');
}
let cookie = xinghe_yx_xyc.cookie;
let csrfToken = xinghe_yx_xyc.csrf_token;
task();

async function task() {
    if (!cookie || !csrfToken) {
        console.log("请先去严选心愿城抓包cookie和csrf_token");
        return;
    }
    await getUserBuildingInfo();
    await getTaskList();
}

async function getTaskList() {
    return new Promise((resolve) => {
        $.get(taskurl("getTaskList"), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(JSON.stringify(err));
                    console.log(`${$.name} getTaskList API请求失败，请检查网路重试`);
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 200) {
                            // taskType 10 每日打卡   2000"浏览活动页面10秒" 3000点击5个商品"  5000 【Pro专享】点击5个商品
                            // 50  邀请好友助力   40 完成1笔订单   60 续费Pro会员
                            let taskLists = data.data;
                            for (let i = 0; i < taskLists.length; i++) {
                                if (taskLists[i].taskType === 10) {
                                    // 打卡
                                    if (taskLists[i].finishedChance < taskLists[i].totalChance) {
                                        console.log("开始签到打卡");
                                        await finishTask({
                                            taskType: taskLists[i].taskType,
                                            taskId: taskLists[i].id,
                                        });
                                        await $.wait(2000);
                                    } else {
                                        console.log("已经签到过了");
                                    }
                                } else if (taskLists[i].taskType === 2000) {
                                    if (taskLists[i].finishedChance < taskLists[i].totalChance) {
                                        // 浏览活动页面10秒
                                        let remainChance =
                                            taskLists[i].totalChance - taskLists[i].finishedChance;
                                        for (let j = 1; j <= remainChance; j++) {
                                            console.log(`浏览活动页面开始第${j}次`);
                                            await getShowTask({
                                                taskType: taskLists[i].taskType,
                                                taskId: taskLists[i].id,
                                            });
                                            await $.wait(12000);
                                            // 浏览活动完成
                                            console.log(`浏览活动页面第${j}次完成`);
                                            let completeTaskRst = await finishTask({
                                                taskType: taskLists[i].taskType,
                                                taskId: taskLists[i].id,
                                            });
                                            await $.wait(3000);
                                            // 浏览领取爱心
                                            if (completeTaskRst.rewardId) {
                                                console.log(`浏览活动页面第${j}次领取奖励`);
                                                await receiveReward({
                                                    rewardIds: [completeTaskRst.rewardId + ""],
                                                    taskType: taskLists[i].taskType,
                                                });
                                                await $.wait(2000);
                                            }
                                        }
                                    } else {
                                        console.log("浏览活动页面任务已做完");
                                    }
                                } else if (taskLists[i].taskType === 3000) {
                                    // todo: 貌似有bug，手动点击也不生效 点击5个商品
                                    // if (taskLists[i].finishedChance < taskLists[i].totalChance) {
                                    //     console.log('点击5个商品开始')
                                    //     await getShowTask({
                                    //         "taskType": taskLists[i].taskType,
                                    //         "taskId": taskLists[i].id
                                    //     });
                                    // } else {
                                    //     console.log('点击5个商品任务已做完')
                                    // }
                                } else if (taskLists[i].taskType === 5000) {
                                    // todo: 貌似有bug，手动点击也不生效  Pro专享】点击5个商品
                                }
                            }
                        } else {
                            console.log(`失败：${data.msg}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data);
            }
        });
    });
}

async function getShowTask(task) {
    return new Promise((resolve) => {
        $.get(
            taskurl(
                `getShowTask?taskType=${task.taskType}&taskId=${task.taskId
                }&_=${Date.now()}`
            ),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} getShowTask API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log("getShowTask", data);
                            } else {
                                console.log(`失败：${data.msg}`);
                            }
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            }
        );
    });
}

async function finishTask(task) {
    return new Promise((resolve) => {
        $.post(
            taskurl("finishTask", {
                body: JSON.stringify(task),
            }),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} finishTask API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                resolve(data.data);
                            } else {
                                console.log(`失败：${data.msg}`);
                            }
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            }
        );
    });
}

// 收取奖励
async function receiveReward(task) {
    return new Promise((resolve) => {
        $.post(
            taskurl("receiveReward", {
                body: JSON.stringify(task),
            }),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} receiveReward API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log(data);
                            } else {
                                console.log(`失败：${data.msg}`);
                            }
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            }
        );
    });
}

// 升级建筑
async function buildingUpgrade(buildingId) {
    return new Promise((resolve) => {
        $.post(
            taskurl("buildingUpgrade", {
                body: JSON.stringify({ buildingId }),
            }),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(
                            `${$.name} buildingUpgrade API请求失败，请检查网路重试`
                        );
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log("建筑升级成功");
                            } else {
                                console.log(`失败：${data.msg}`);
                            }
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            }
        );
    });
}

async function searchBuilding(buildingId) {
    return new Promise((resolve) => {
        $.get(
            taskurl(`searchBuilding?type=2&buildingId=${buildingId}`),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} searchBuilding API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                resolve(data.data);
                            } else {
                                console.log(`失败：${data.msg}`);
                            }
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            }
        );
    });
}

async function getUserBuildingInfo() {
    return new Promise((resolve) => {
        $.get(taskurl("getUserBuildingInfo"), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(JSON.stringify(err));
                    console.log(
                        `${$.name} getUserBuildingInfo API请求失败，请检查网路重试`
                    );
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 200) {
                            // 获取用户userBuildingInfo
                            const { userBuildingInfo, hasSpecialTaskCount } = data.data;
                            // 需要收取金币的建筑
                            let waitCollectCoinBuildings = [];
                            userBuildingInfo.forEach((item) => {
                                waitCollectCoinBuildings.push(item.buildingId);
                            });
                            console.log(`需要收集金币的建筑有${waitCollectCoinBuildings}`);
                            for (let i = 0; i < waitCollectCoinBuildings.length; i++) {
                                const curBuilding = waitCollectCoinBuildings[i];
                                console.log(`开始收集建筑${curBuilding}的金币`);
                                await receiveGoldCoin(curBuilding);
                                await $.wait(2000);
                                const buildingDetail = await searchBuilding(curBuilding);
                                if (buildingDetail.buyBuilding.canUpgrade) {
                                    console.log(`开始升级建筑${curBuilding}`);
                                    // await buildingUpgrade(curBuilding);
                                } else {
                                    console.log(`建筑${curBuilding}无法升级`);
                                }
                            }
                            // 是否有弹窗奖励收集
                            if (hasSpecialTaskCount) {
                                console.log("开始收集弹窗奖励");
                                await receiveSpecialGoldCoin();
                            } else {
                                console.log("弹窗奖励已收集完毕");
                            }
                        } else {
                            console.log(`失败：${data.msg}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data);
            }
        });
    });
}

async function receiveGoldCoin(buildingId) {
    return new Promise((resolve) => {
        $.post(
            taskurl("receiveGoldCoin", {
                body: JSON.stringify({ buildingId }),
            }),
            (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(
                            `${$.name} receiveGoldCoin API请求失败，请检查网路重试`
                        );
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log(`收集金币${data.data.addCoin}成功`);
                            } else {
                                console.log(`收集金币失败：${data.msg}`);
                            }
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            }
        );
    });
}

async function receiveSpecialGoldCoin() {
    return new Promise((resolve) => {
        $.post(taskurl("receiveSpecialGoldCoin"), (err, resp, data) => {
            try {
                if (err) {
                    console.log(JSON.stringify(err));
                    console.log(
                        `${$.name} receiveSpecialGoldCoin API请求失败，请检查网路重试`
                    );
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 200) {
                            console.log(`本次收到弹窗奖励${data.data.addCoin}`);
                        } else {
                            console.log(`弹窗奖励失败：${data.msg}`);
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data);
            }
        });
    });
}

function taskurl(api, body) {
    const options = {
        url: `${YX_API_HOST}/${api}${api.includes("?") ? "&" : "?"
            }csrf_token=${csrfToken}&__timestamp=${Date.now()}`,
        headers: {
            Host: "act.you.163.com",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/json",
            "Accept-Language": "zh-CN,zh-Hans;q=0.9",
            "User-Agent": ua,
            Referer: "https://act.you.163.com/",
            "Accept-Encoding": "gzip, deflate, br",
            cookie: cookie,
        },
    };
    return body ? Object.assign(options, body) : options;
}

function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        }
    } catch (e) {
        console.log(e);
        console.log(`服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function Env(name, opts) {
    class Http {
        constructor(env) {
            this.env = env;
        }

        send(opts, method = "GET") {
            opts = typeof opts === "string" ? { url: opts } : opts;
            let sender = this.get;
            if (method === "POST") {
                sender = this.post;
            }
            return new Promise((resolve, reject) => {
                sender.call(this, opts, (err, resp, body) => {
                    if (err) reject(err);
                    else resolve(resp);
                });
            });
        }

        get(opts) {
            return this.send.call(this.env, opts);
        }

        post(opts) {
            return this.send.call(this.env, opts, "POST");
        }
    }

    return new (class {
        constructor(name, opts) {
            this.name = name;
            this.http = new Http(this);
            this.data = null;
            this.dataFile = "box.dat";
            this.logs = [];
            this.isMute = false;
            this.isNeedRewrite = false;
            this.logSeparator = "\n";
            this.encoding = "utf-8";
            this.startTime = new Date().getTime();
            Object.assign(this, opts);
            this.log("", `🔔${this.name}, 开始!`);
        }

        isNode() {
            return "undefined" !== typeof module && !!module.exports;
        }

        isQuanX() {
            return "undefined" !== typeof $task;
        }

        isSurge() {
            return "undefined" !== typeof $httpClient && "undefined" === typeof $loon;
        }

        isLoon() {
            return "undefined" !== typeof $loon;
        }

        isShadowrocket() {
            return "undefined" !== typeof $rocket;
        }

        toObj(str, defaultValue = null) {
            try {
                return JSON.parse(str);
            } catch {
                return defaultValue;
            }
        }

        toStr(obj, defaultValue = null) {
            try {
                return JSON.stringify(obj);
            } catch {
                return defaultValue;
            }
        }

        getjson(key, defaultValue) {
            let json = defaultValue;
            const val = this.getdata(key);
            if (val) {
                try {
                    json = JSON.parse(this.getdata(key));
                } catch { }
            }
            return json;
        }

        setjson(val, key) {
            try {
                return this.setdata(JSON.stringify(val), key);
            } catch {
                return false;
            }
        }

        getScript(url) {
            return new Promise((resolve) => {
                this.get({ url }, (err, resp, body) => resolve(body));
            });
        }

        runScript(script, runOpts) {
            return new Promise((resolve) => {
                let httpapi = this.getdata("@chavy_boxjs_userCfgs.httpapi");
                httpapi = httpapi ? httpapi.replace(/\n/g, "").trim() : httpapi;
                let httpapi_timeout = this.getdata(
                    "@chavy_boxjs_userCfgs.httpapi_timeout"
                );
                httpapi_timeout = httpapi_timeout ? httpapi_timeout * 1 : 20;
                httpapi_timeout =
                    runOpts && runOpts.timeout ? runOpts.timeout : httpapi_timeout;
                const [key, addr] = httpapi.split("@");
                const opts = {
                    url: `http://${addr}/v1/scripting/evaluate`,
                    body: {
                        script_text: script,
                        mock_type: "cron",
                        timeout: httpapi_timeout,
                    },
                    headers: { "X-Key": key, Accept: "*/*" },
                };
                this.post(opts, (err, resp, body) => resolve(body));
            }).catch((e) => this.logErr(e));
        }

        loaddata() {
            if (this.isNode()) {
                this.fs = this.fs ? this.fs : require("fs");
                this.path = this.path ? this.path : require("path");
                const curDirDataFilePath = this.path.resolve(this.dataFile);
                const rootDirDataFilePath = this.path.resolve(
                    process.cwd(),
                    this.dataFile
                );
                const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath);
                const isRootDirDataFile =
                    !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath);
                if (isCurDirDataFile || isRootDirDataFile) {
                    const datPath = isCurDirDataFile
                        ? curDirDataFilePath
                        : rootDirDataFilePath;
                    try {
                        return JSON.parse(this.fs.readFileSync(datPath));
                    } catch (e) {
                        return {};
                    }
                } else return {};
            } else return {};
        }

        writedata() {
            if (this.isNode()) {
                this.fs = this.fs ? this.fs : require("fs");
                this.path = this.path ? this.path : require("path");
                const curDirDataFilePath = this.path.resolve(this.dataFile);
                const rootDirDataFilePath = this.path.resolve(
                    process.cwd(),
                    this.dataFile
                );
                const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath);
                const isRootDirDataFile =
                    !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath);
                const jsondata = JSON.stringify(this.data);
                if (isCurDirDataFile) {
                    this.fs.writeFileSync(curDirDataFilePath, jsondata);
                } else if (isRootDirDataFile) {
                    this.fs.writeFileSync(rootDirDataFilePath, jsondata);
                } else {
                    this.fs.writeFileSync(curDirDataFilePath, jsondata);
                }
            }
        }

        lodash_get(source, path, defaultValue = undefined) {
            const paths = path.replace(/\[(\d+)\]/g, ".$1").split(".");
            let result = source;
            for (const p of paths) {
                result = Object(result)[p];
                if (result === undefined) {
                    return defaultValue;
                }
            }
            return result;
        }

        lodash_set(obj, path, value) {
            if (Object(obj) !== obj) return obj;
            if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
            path
                .slice(0, -1)
                .reduce(
                    (a, c, i) =>
                        Object(a[c]) === a[c]
                            ? a[c]
                            : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {}),
                    obj
                )[path[path.length - 1]] = value;
            return obj;
        }

        getdata(key) {
            let val = this.getval(key);
            // 如果以 @
            if (/^@/.test(key)) {
                const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key);
                const objval = objkey ? this.getval(objkey) : "";
                if (objval) {
                    try {
                        const objedval = JSON.parse(objval);
                        val = objedval ? this.lodash_get(objedval, paths, "") : val;
                    } catch (e) {
                        val = "";
                    }
                }
            }
            return val;
        }

        setdata(val, key) {
            let issuc = false;
            if (/^@/.test(key)) {
                const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key);
                const objdat = this.getval(objkey);
                const objval = objkey
                    ? objdat === "null"
                        ? null
                        : objdat || "{}"
                    : "{}";
                try {
                    const objedval = JSON.parse(objval);
                    this.lodash_set(objedval, paths, val);
                    issuc = this.setval(JSON.stringify(objedval), objkey);
                } catch (e) {
                    const objedval = {};
                    this.lodash_set(objedval, paths, val);
                    issuc = this.setval(JSON.stringify(objedval), objkey);
                }
            } else {
                issuc = this.setval(val, key);
            }
            return issuc;
        }

        getval(key) {
            if (this.isSurge() || this.isLoon()) {
                return $persistentStore.read(key);
            } else if (this.isQuanX()) {
                return $prefs.valueForKey(key);
            } else if (this.isNode()) {
                this.data = this.loaddata();
                return this.data[key];
            } else {
                return (this.data && this.data[key]) || null;
            }
        }

        setval(val, key) {
            if (this.isSurge() || this.isLoon()) {
                return $persistentStore.write(val, key);
            } else if (this.isQuanX()) {
                return $prefs.setValueForKey(val, key);
            } else if (this.isNode()) {
                this.data = this.loaddata();
                this.data[key] = val;
                this.writedata();
                return true;
            } else {
                return (this.data && this.data[key]) || null;
            }
        }

        initGotEnv(opts) {
            this.got = this.got ? this.got : require("got");
            this.cktough = this.cktough ? this.cktough : require("tough-cookie");
            this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar();
            if (opts) {
                opts.headers = opts.headers ? opts.headers : {};
                if (undefined === opts.headers.Cookie && undefined === opts.cookieJar) {
                    opts.cookieJar = this.ckjar;
                }
            }
        }

        get(opts, callback = () => { }) {
            if (opts.headers) {
                delete opts.headers["Content-Type"];
                delete opts.headers["Content-Length"];
            }
            if (this.isSurge() || this.isLoon()) {
                if (this.isSurge() && this.isNeedRewrite) {
                    opts.headers = opts.headers || {};
                    Object.assign(opts.headers, { "X-Surge-Skip-Scripting": false });
                }
                $httpClient.get(opts, (err, resp, body) => {
                    if (!err && resp) {
                        resp.body = body;
                        resp.statusCode = resp.status;
                    }
                    callback(err, resp, body);
                });
            } else if (this.isQuanX()) {
                if (this.isNeedRewrite) {
                    opts.opts = opts.opts || {};
                    Object.assign(opts.opts, { hints: false });
                }
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp;
                        callback(null, { status, statusCode, headers, body }, body);
                    },
                    (err) => callback(err)
                );
            } else if (this.isNode()) {
                let iconv = require("iconv-lite");
                this.initGotEnv(opts);
                this.got(opts)
                    .on("redirect", (resp, nextOpts) => {
                        try {
                            if (resp.headers["set-cookie"]) {
                                const ck = resp.headers["set-cookie"]
                                    .map(this.cktough.Cookie.parse)
                                    .toString();
                                if (ck) {
                                    this.ckjar.setCookieSync(ck, null);
                                }
                                nextOpts.cookieJar = this.ckjar;
                            }
                        } catch (e) {
                            this.logErr(e);
                        }
                        // this.ckjar.setCookieSync(resp.headers['set-cookie'].map(Cookie.parse).toString())
                    })
                    .then(
                        (resp) => {
                            const { statusCode: status, statusCode, headers, rawBody } = resp;
                            callback(
                                null,
                                { status, statusCode, headers, rawBody },
                                iconv.decode(rawBody, this.encoding)
                            );
                        },
                        (err) => {
                            const { message: error, response: resp } = err;
                            callback(
                                error,
                                resp,
                                resp && iconv.decode(resp.rawBody, this.encoding)
                            );
                        }
                    );
            }
        }

        post(opts, callback = () => { }) {
            const method = opts.method ? opts.method.toLocaleLowerCase() : "post";
            // 如果指定了请求体, 但没指定`Content-Type`, 则自动生成
            if (opts.body && opts.headers && !opts.headers["Content-Type"]) {
                opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
            if (opts.headers) delete opts.headers["Content-Length"];
            if (this.isSurge() || this.isLoon()) {
                if (this.isSurge() && this.isNeedRewrite) {
                    opts.headers = opts.headers || {};
                    Object.assign(opts.headers, { "X-Surge-Skip-Scripting": false });
                }
                $httpClient[method](opts, (err, resp, body) => {
                    if (!err && resp) {
                        resp.body = body;
                        resp.statusCode = resp.status;
                    }
                    callback(err, resp, body);
                });
            } else if (this.isQuanX()) {
                opts.method = method;
                if (this.isNeedRewrite) {
                    opts.opts = opts.opts || {};
                    Object.assign(opts.opts, { hints: false });
                }
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp;
                        callback(null, { status, statusCode, headers, body }, body);
                    },
                    (err) => callback(err)
                );
            } else if (this.isNode()) {
                let iconv = require("iconv-lite");
                this.initGotEnv(opts);
                const { url, ..._opts } = opts;
                this.got[method](url, _opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, rawBody } = resp;
                        callback(
                            null,
                            { status, statusCode, headers, rawBody },
                            iconv.decode(rawBody, this.encoding)
                        );
                    },
                    (err) => {
                        const { message: error, response: resp } = err;
                        callback(
                            error,
                            resp,
                            resp && iconv.decode(resp.rawBody, this.encoding)
                        );
                    }
                );
            }
        }
        /**
         *
         * 示例:$.time('yyyy-MM-dd qq HH:mm:ss.S')
         *    :$.time('yyyyMMddHHmmssS')
         *    y:年 M:月 d:日 q:季 H:时 m:分 s:秒 S:毫秒
         *    其中y可选0-4位占位符、S可选0-1位占位符，其余可选0-2位占位符
         * @param {string} fmt 格式化参数
         * @param {number} 可选: 根据指定时间戳返回格式化日期
         *
         */
        time(fmt, ts = null) {
            const date = ts ? new Date(ts) : new Date();
            let o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "H+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                S: date.getMilliseconds(),
            };
            if (/(y+)/.test(fmt))
                fmt = fmt.replace(
                    RegExp.$1,
                    (date.getFullYear() + "").substr(4 - RegExp.$1.length)
                );
            for (let k in o)
                if (new RegExp("(" + k + ")").test(fmt))
                    fmt = fmt.replace(
                        RegExp.$1,
                        RegExp.$1.length == 1
                            ? o[k]
                            : ("00" + o[k]).substr(("" + o[k]).length)
                    );
            return fmt;
        }

        /**
         * 系统通知
         *
         * > 通知参数: 同时支持 QuanX 和 Loon 两种格式, EnvJs根据运行环境自动转换, Surge 环境不支持多媒体通知
         *
         * 示例:
         * $.msg(title, subt, desc, 'twitter://')
         * $.msg(title, subt, desc, { 'open-url': 'twitter://', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
         * $.msg(title, subt, desc, { 'open-url': 'https://bing.com', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
         *
         * @param {*} title 标题
         * @param {*} subt 副标题
         * @param {*} desc 通知详情
         * @param {*} opts 通知参数
         *
         */
        msg(title = name, subt = "", desc = "", opts) {
            const toEnvOpts = (rawopts) => {
                if (!rawopts) return rawopts;
                if (typeof rawopts === "string") {
                    if (this.isLoon()) return rawopts;
                    else if (this.isQuanX()) return { "open-url": rawopts };
                    else if (this.isSurge()) return { url: rawopts };
                    else return undefined;
                } else if (typeof rawopts === "object") {
                    if (this.isLoon()) {
                        let openUrl = rawopts.openUrl || rawopts.url || rawopts["open-url"];
                        let mediaUrl = rawopts.mediaUrl || rawopts["media-url"];
                        return { openUrl, mediaUrl };
                    } else if (this.isQuanX()) {
                        let openUrl = rawopts["open-url"] || rawopts.url || rawopts.openUrl;
                        let mediaUrl = rawopts["media-url"] || rawopts.mediaUrl;
                        return { "open-url": openUrl, "media-url": mediaUrl };
                    } else if (this.isSurge()) {
                        let openUrl = rawopts.url || rawopts.openUrl || rawopts["open-url"];
                        return { url: openUrl };
                    }
                } else {
                    return undefined;
                }
            };
            if (!this.isMute) {
                if (this.isSurge() || this.isLoon()) {
                    $notification.post(title, subt, desc, toEnvOpts(opts));
                } else if (this.isQuanX()) {
                    $notify(title, subt, desc, toEnvOpts(opts));
                }
            }
            if (!this.isMuteLog) {
                let logs = ["", "==============📣系统通知📣=============="];
                logs.push(title);
                subt ? logs.push(subt) : "";
                desc ? logs.push(desc) : "";
                console.log(logs.join("\n"));
                this.logs = this.logs.concat(logs);
            }
        }

        log(...logs) {
            if (logs.length > 0) {
                this.logs = [...this.logs, ...logs];
            }
            console.log(logs.join(this.logSeparator));
        }

        logErr(err, msg) {
            const isPrintSack = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            if (!isPrintSack) {
                this.log("", `❗️${this.name}, 错误!`, err);
            } else {
                this.log("", `❗️${this.name}, 错误!`, err.stack);
            }
        }

        wait(time) {
            return new Promise((resolve) => setTimeout(resolve, time));
        }

        done(val = {}) {
            const endTime = new Date().getTime();
            const costTime = (endTime - this.startTime) / 1000;
            this.log("", `🔔${this.name}, 结束! 🕛 ${costTime} 秒`);
            this.log();
            if (this.isSurge() || this.isQuanX() || this.isLoon()) {
                $done(val);
            }
        }
    })(name, opts);
}
