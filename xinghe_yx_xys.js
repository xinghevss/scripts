/**
 * 严选心愿树
 * ql raw https://raw.githubusercontent.com/xinghevss/scripts/main/xinghe_yx_xys.js
 * 变量格式为 export xinghe_yx='{"csrf_token":"抓包csrf_token","cookie":"抓包cookie"}' 与严选心愿城通用
 * 抓包https://act.you.163.com/act/napi    
 * csrf_token在链接，cookie在请求体头部   
 * cron 30 8,13,19 * * *
 */
const $ = new Env("严选心愿树");
const YX_API_HOST = "https://act.you.163.com/act/napi/wish-tree";
const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 yanxuan/6.7.7 app-chan-id/AppStore";
// 此处填写cookie和csrf_token，暂时只支持青龙
let xinghe_yx;
try {
    xinghe_yx = JSON.parse(xinghe_yx || process.env.xinghe_yx);
} catch (error) {
    console.log("cookie格式填写错误");
}
let cookie = xinghe_yx.cookie;
let csrfToken = xinghe_yx.csrf_token;
task();


const notify = $.isNode() ? require('./sendNotify') : '';
//0为关闭通知，1为打开通知，默认为1，可以在环境变量设置
let notifyFlag = ($.isNode() ? process.env.yxNotify : $.getdata('yxNotify')) || 1;
let notifyStr = '';

//通知
async function Showmsg() {
    
    let notifyBody = $.name + "运行通知\n\n" + notifyStr
    
    if (notifyFlag != 1) {
        console.log(notifyBody);
    }

    if (notifyFlag == 1) {
        $.msg(notifyBody);
        if ($.isNode()){await notify.sendNotify($.name, notifyBody );}
    }
}


async function task() {
    if (!cookie || !csrfToken) {
        console.log("请先去严选心愿城抓包cookie和csrf_token");
        return;
    }
    await tomorrowWater();
    await getTaskList();
    await getUserTreeInfo();
    await getFinishedAwardList();
    await Showmsg();
}

// 每天福利水滴状态
async function tomorrowWater () {
    return new Promise((resolve) => {
        $.get(
            taskurl(`tomorrowWater`),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} tomorrowWater API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                if (data.data.status) {
                                    console.log('有福利水滴领取');
                                    notifyStr += `有福利水滴领取`;
                                    await getTomorrowWater();
                                } else {
                                    console.log('今日福利水滴已领取');
                                    notifyStr += `今日福利水滴已领取\n`;
                                }
                            } else {
                                console.log(`失败：${data.msg}`);
                                notifyStr += `${data.code}`;
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
async function getTomorrowWater () {
    return new Promise((resolve) => {
        $.get(
            taskurl(`getTomorrowWater`),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} getTomorrowWater API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log(`获取每天福利水滴${data.data.kettleWater}滴`);
                                notifyStr += `获取每天福利水滴${data.data.kettleWater}滴\n`
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

// 浇水
async function waterFertilization(water) {
    return new Promise((resolve) => {
        $.post(
            taskurl(
                `waterFertilization`,
                {
                    body: JSON.stringify(water)
                }
            ),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} waterFertilization API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log('浇水成功');
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

async function getFinishedAwardList() {
    return new Promise((resolve) => {
        $.get(
            taskurl(
                `getFinishedAwardList`
            ),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} getFinishedAwardList API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                if (data.data.length > 0) {
                                    console.log('getFinishedAwardList开始领取奖励')
                                    notifyStr += `getFinishedAwardList开始领取奖励\n`
                                    for (let i = 0; i < data.data.length; i++) {
                                        await receiveReward({
                                            rewardIds: [data.data[i].id + ""],
                                            taskType: data.data[i].taskType,
                                        });
                                        await $.wait(2000);
                                    }
                                } else {
                                    console.log('getFinishedAwardList当前没有奖励可以领取')
                                    notifyStr += `getFinishedAwardList当前没有奖励可以领取\n`
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
            }
        );
    });
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
                            // taskType 10 每日签到   3"三餐福利水滴"  1 浏览活动页面10秒"  4点击5个商品
                            // 5 当天连续签到2次   6 发现严选好物   13邀请好友助力
                            let taskLists = data.data;
                            for (let i = 0; i < taskLists.length; i++) {
                                if (taskLists[i].taskType === 10) {
                                    // 打卡
                                    if (taskLists[i].finishedChance < taskLists[i].totalChance) {
                                        console.log("开始每日签到");
                                        notifyStr += `开始每日签到\n`;
                                        await finishTask({
                                            taskType: taskLists[i].taskType,
                                            taskId: taskLists[i].id,
                                        });
                                        await $.wait(2000);
                                    } else {
                                        console.log("已经签到过了");
                                        notifyStr += `已经签到过了\n`;
                                    }
                                } else if (taskLists[i].taskType === 3) {
                                    // 三餐福利水滴  每日7-9 12-14 18-20可以领取
                                    let threeMealsWaterVo = taskLists[i].threeMealsWaterVo;
                                    // if (threeMealsWaterVo.dinnerStatus || threeMealsWaterVo.lunchStatus || threeMealsWaterVo.morningStatus) {
                                    console.log("开始领取三餐福利水滴");
                                    notifyStr += `开始领取三餐福利水滴\n`;
                                    await getThreeMealsWater();
                                    // } else {
                                    //     console.log("不在领取三餐福利水滴时间");
                                    // }
                                } else if (taskLists[i].taskType === 20) {
                                    if (taskLists[i].finishedChance < taskLists[i].totalChance) {
                                        // 浏览活动页面10秒
                                        let remainChance =
                                            taskLists[i].totalChance - taskLists[i].finishedChance;
                                        for (let j = 1; j <= remainChance; j++) {
                                            console.log(`浏览活动页面开始第${j}次`);
                                            notifyStr += `浏览活动页面开始第${j}次\n`;
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
                                                notifyStr += `浏览活动页面开始第${j}次领取奖励\n`;
                                                await receiveReward({
                                                    rewardIds: [completeTaskRst.rewardId + ""],
                                                    taskType: taskLists[i].taskType,
                                                });
                                                await $.wait(2000);
                                            }
                                        }
                                    } else {
                                        console.log("浏览活动页面任务已做完");
                                        notifyStr += `浏览活动页面任务已做完\n`;
                                    }
                                } else if (taskLists[i].taskType === 80) {
                                    // 当天连续签到2次
                                    if (taskLists[i].finishedChance < taskLists[i].totalChance) {
                                        console.log("开始连续签到2次");
                                        notifyStr += `开始连续签到2次\n`;
                                        await finishTask({
                                            taskType: taskLists[i].taskType,
                                            taskId: taskLists[i].id,
                                        });
                                        await $.wait(2000);
                                    } else {
                                        console.log("已经连续签到2次");
                                        notifyStr += `已经连续签到2次\n`;
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

async function getThreeMealsWater() {
    return new Promise((resolve) => {
        $.get(
            taskurl(
                `getThreeMealsWater`
            ),
            async (err, resp, data) => {
                try {
                    if (err) {
                        console.log(JSON.stringify(err));
                        console.log(`${$.name} getThreeMealsWater API请求失败，请检查网路重试`);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                            if (data.code === 200) {
                                console.log("三餐福利水滴领取成功");
                                notifyStr += `三餐福利水滴领取成功\n`;
                            } else {
                                console.log(`失败：${data.msg}`);
                                notifyStr += `失败：${data.msg}\n`;
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

async function getUserTreeInfo () {
    return new Promise(resolve => {
        $.get(taskurl('getUserTreeInfo'), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(JSON.stringify(err))
                    console.log(`${$.name} getUserTreeInfo API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data)
                        if (data.code === 200) {
                            const { userTreeInfoModel } = data.data;
                            // 营养液
                            if (userTreeInfoModel.nutritionValue < 80) {
                                console.log('浇营养液')
                                notifyStr += `浇营养液\n`;
                                await waterFertilization({
                                    "type": 2,
                                    "waste": false
                                });
                                await $.wait(2000);
                            }
                            for (let i = 1; i < Math.floor(userTreeInfoModel.kettleWaterValue / 10); i++) {
                                console.log(`开始第${i}次浇水`)
                                notifyStr += `开始第${i}次浇水\n`;
                                await waterFertilization({
                                    "type": 1,
                                    "waste": false
                                });
                                await $.wait(2000);
                            }
                        } else {
                            console.log(`失败：${data.msg}`)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data)
            }
        })
    })
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
