"use strict";
/**
 * @description 配信用 音源ランダム再生＆楽曲名表記システム
 * @author マムルファイターV2 / MFV2
 * @version 1.00<br />
 * 2024/09/28️ / v1.02 / README更新, テスト用機能追加<br />
 * 2024/09/28️ / v1.00 / 初版作成<br />
 * 2023/11/18 / v0.10 / 仮作成<br />
 *
 * https://amachamusic.chagasi.com/image_comical.html
 */

/** テスト用フラグ */
let g_testFlg = document.location.href.includes(`testFlg=On`);
/** 楽曲ボリューム基本設定 */
let g_baseVol = g_testFlg ? 20 : 100;
/** 楽曲リスト保存用 */
let g_playlist = [];
/** 楽曲格納フォルダ名 */
let g_folder = `music/`;

/**
 * @description ページ読み込み完了時実行関数<br />
 * HTML内の要素を読み出しきった時に実行するメイン関数です。<br />
 */
const onHtmlLoad = () => {
    // css記述を動的に書き出しする。
    cssSet();

    // 楽曲リストを取得する。
    g_playlist = getMusicList();

    // 初回に再生する楽曲を選択する。。
    executeFirstSelect();

    // 各楽曲が再生終了した時にイベントが発火するように設定する。
    document.querySelectorAll(`audio`).forEach((elm) => {
        elm.addEventListener(`ended`, (event) => {
            // 現在再生中の楽曲番号を取得する。
            let nowNo = Number(event.target.id.replace(`audio`, ``));

            // 次曲を再生する。
            executeMusicSelect(nowNo);
        });
    });
};

/**
 *
 * @description 楽曲リスト取得<br />
 * 楽曲リストを取得します。<br />
 * @return {Array<Object>} プレイリスト
 */
const getMusicList = () => {
    // URLパラメータからプレイリスト名を取得する。
    let url = new URL(document.location.href);
    let param = url.searchParams;
    let scene = param.get(`scene`);

    // URLパラメータが存在しない場合、HTMLファイル名をプレイリスト名にする。
    if (!scene) {
        // 現在のページのパスを取得し、ファイル名を抽出する。
        let path = window.location.pathname;
        let fileName = path.substring(path.lastIndexOf(`/`) + 1);
        scene = fileName.split(`.`)[0];
    }

    // 存在しないプレイリスト名の場合はプレイリスト名を"default"にする。
    // defaultのプレイリストを空にした場合の考慮は放棄する。
    // 変な使い方をする人は動作保証外とします。
    if (!g_musicList[scene]) {
        scene = `default`;
    }

    // 楽曲リストを取得する。
    let playlist = g_musicList[scene];

    // 楽曲リストをソートする。
    playlist.sort((lh, rh) => {
        // 【ソート仕様】
        // ・作曲者名+楽曲名 を連結して文字列ソートを行う。
        // ・大文字小文字を無視する。
        const lhStr = lh.artist.toUpperCase() + lh.title.toUpperCase();
        const rhStr = rh.artist.toUpperCase() + lh.title.toUpperCase();
        if (lhStr < rhStr) {
            return -1;
        }
        return 1;
    });

    return playlist;
};

/**
 * @description 初回再生楽曲選択<br />
 * 初回に再生する楽曲を選択する。<br />
 */
const executeFirstSelect = () => {
    // 初回に再生する曲番号を抽選する。
    let firstNum = Math.floor(Math.random() * g_playlist.length);

    // 楽曲再生用のHTML要素を格納するdiv要素を作成する。
    let boxDiv = document.createElement(`div`);

    g_playlist.forEach((obj, idx) => {
        // 初回再生楽曲フラグを定義する。
        let firstFlg = idx == firstNum;

        // audio要素を作成する。
        let audio = new Audio();
        audio.setAttribute(`id`, `audio${idx}`);

        // 楽曲を読み込む。
        audio.src = `${g_folder}${obj.url}`;
        audio.volume = getAudioVolume(idx);

        // 初回再生楽曲なら自動再生する。
        // OBS上のブラウザでは制限なく自動再生できるが、Chromeなど最新のブラウザでは
        // セキュリティ上の理由でユーザ操作なしに自動再生することは不可能のため注意。
        audio.autoplay = firstFlg;

        // テスト用に、エンターキー押下で音源を再生する処理を定義する。
        // OBS上では多分エンターキー押下イベントは発火できない。
        if (firstFlg) {
            let keyDownFunc = (event) => {
                // エンターキー（キーコード13）を押したかどうか確認
                if (event.key === `Enter`) {
                    audio.play();
                    document.removeEventListener(`keydown`, keyDownFunc);
                }
            };
            document.addEventListener(`keydown`, keyDownFunc);
        }

        // テストモードならプレイヤーを表示する。
        audio.controls = g_testFlg;

        // 楽曲名表記用のHTML要素を作成する。
        if (g_testFlg) {
            let titleDiv = document.createElement(`div`);
            titleDiv.innerHTML = makeTitleStr(obj);
            titleDiv.classList.add(`testMusicName`);
            boxDiv.appendChild(titleDiv);
        }

        // 楽曲再生用のHTML要素を作成する。
        boxDiv.appendChild(audio);

        // 楽曲リスト内の番号を定義する。
        g_playlist[idx].num = idx;

        // 楽曲リスト内の再生フラグをtrue/falseにする。
        g_playlist[idx].play = firstFlg;
    });

    // 楽曲再生用のHTML要素を出力する。
    document.getElementById(`list`).appendChild(boxDiv);

    // 楽曲名テキストの表示を更新する。
    refreshCreditView(firstNum);

    // ここでexecuteMusicSelect関数を呼ばない理由は、
    // ここで呼び出しを行った場合、HTML要素がまだ生成されていない段階で
    // 楽曲の再生処理を行ってしまいエラーとなってしまうためである。
    // 初回の再生はaudio要素のautoplayオプションで賄う。
    // なお上記の通りChromeなどのブラウザではautoplayオプションでの自動再生は出来ない。

    // テスト用ログを出力する。
    selectMusicLogger(firstNum, `抽選結果(初回)`);
};

/**
 * @description 初回以降再生楽曲選択<br />
 * 初回以降に再生する楽曲を選択する。<br />
 * @param {Number} _nowNo 現在再生中の楽曲番号
 */
const executeMusicSelect = (_nowNo = null) => {
    // 再生済み楽曲数をカウントする。
    let completedCnt = g_playlist.filter((obj) => obj.play).length;

    // 全ての楽曲が再生済みになったら、全て再生フラグをfalseにリセットする。
    if (completedCnt == g_playlist.length) {
        for (const obj of g_playlist) {
            obj.play = false;
        }
    }

    // 未再生の楽曲番号一覧を作成する。
    let numList = [];
    for (const obj of g_playlist) {
        // 再生済フラグが立っている場合は処理スキップ。
        if (obj.play) {
            continue;
        }
        // 現在再生中の楽曲番号の場合は処理スキップ。
        // 通常はこの分岐に入ることはないが、
        // 全楽曲を再生し終わって全楽曲の再生フラグをリセットした時のみ、
        // 同曲連続再生がありえるためこの分岐で阻止する。
        if (obj.num == _nowNo) {
            continue;
        }

        // 未再生の楽曲番号一覧に楽曲番号を追加する。
        numList.push(obj.num);
    }

    // 未再生の楽曲番号一覧から抽選する。
    let rand = Math.floor(Math.random() * numList.length);
    let num = numList[rand];

    // 選択された楽曲の再生フラグをtrueにする。
    g_playlist[num].play = true;

    // 選択された楽曲を再生する。
    let audio = document.getElementById(`audio${num}`);
    audio.play(g_playlist);

    // 楽曲名テキストの表示を更新する。
    refreshCreditView(num);

    // テスト用ログを出力する。
    logger(`//----------------------------`);
    logger(`抽選済: ${completedCnt}曲`);
    logger(`未再生の楽曲番号一覧: ${numList}`);
    selectMusicLogger(num);
    logger(g_playlist);
};

/**
 * @description 楽曲名テキスト表示更新<br />
 * 楽曲名テキストの表示を更新する。<br />
 * @param {Number} _num 楽曲番号
 */
let refreshCreditView = (_num) => {
    let tElm = document.getElementById(`title`);

    /** タイマーによるwait関数定義 */
    const wait = (seconds) => {
        return new Promise((resolve) => {
            setTimeout(resolve, seconds * 1000);
        });
    };

    // 楽曲名表示の更新を行う。
    // タイマーを利用してdiv要素のクラスを順番に入れ替える。
    wait(0.2)
        .then(() => {
            /** 前曲の楽曲名表記を徐々に消すクラスを設定 */
            tElm.classList.add(`fadeOut`);

            return wait(0.2);
        })
        .then(() => {
            /** 前曲の楽曲名表記を徐々に消すクラスを削除 */
            tElm.classList.remove(`fadeOut`);

            /** 楽曲名更新/次曲の楽曲名表記が長い場合はスクロールするクラスを設定 */
            setCreditScroll(_num);

            /** 次曲の楽曲名表記を徐々に表示するクラスを設定 */
            tElm.classList.add(`fadeIn`);

            return wait(0.2);
        })
        .then(() => {
            /** 次曲の楽曲名表記を徐々に表示するクラスを削除 */
            tElm.classList.remove(`fadeIn`);
        });
};

/**
 * @description 楽曲音量取得<br />
 * 楽曲再生時の音量設定を取得する。<br />
 * @param {Number} _num 楽曲番号
 * @return {Number} 音量
 */
let getAudioVolume = (_num) => {
    let musicVol = 100;
    // 楽曲毎個別音量設定を取得する。
    if (g_playlist[_num].volume) {
        musicVol = g_playlist[_num].volume;
    }

    return (musicVol / 100) * (g_baseVol / 100);
};

/**
 * @description 楽曲名テキストスクロール設定<br />
 * 楽曲名テキストのスクロールを設定する。<br />
 * @param {Number} _num 楽曲番号
 */
let setCreditScroll = (_num) => {
    let sElm = document.getElementById(`scroll`);
    let title = makeTitleStr(g_playlist[_num]);
    let spanId = `music${_num}span`;

    // 楽曲名テキストを更新する。
    sElm.innerHTML = `<span id="${spanId}">${title}</span>`;

    // 楽曲名テキストの横幅を設定する。
    let offsetWidth = document.getElementById(spanId).offsetWidth;
    sElm.style.width = `${offsetWidth}px`;

    // 楽曲名テキストの横幅が、ウィンドウの横幅より大きい場合はHTML要素にクラスを設定する。
    let className = `MusicSelectorScroll`;
    sElm.classList.remove(className);
    if (window.innerWidth < offsetWidth) {
        sElm.classList.add(className);
    }
};

/**
 * @description 楽曲名テキスト作成<br />
 * 楽曲名/作曲者名の表記を行うためのテキスト文を作成する。<br />
 * @param {Object} _obj 楽曲情報オブジェクト
 * @return {String} 楽曲名テキスト
 */
let makeTitleStr = (_obj) => {
    let title = `♪${_obj.title} / ${_obj.artist}`;

    // 収録アルバム名が定義されている場合は文章に追加する。
    if (_obj.from) {
        title += ` / from:${_obj.from}`;
    }

    return title;
};

/**
 * @description css記述動的書き出し<br />
 * css記述を動的に書き出しする。<br />
 */
let cssSet = () => {
    document.getElementById(`css`).innerHTML = `
        <style>
            body {
                overflow-x: hidden;
                ${g_testFlg ? "" : "overflow-y: hidden;"}
            }
            .title {
                width: ${window.innerWidth}px;
            }
            @keyframes marquee {
                from { transform: translateX(${window.innerWidth}px);}
                to   { transform: translateX(-100%);}
            }
        </style>
    `;
};

/**
 * @description 楽曲名ログ出力<br />
 * 楽曲名ログを出力します。<br />
 * @param {Number} _num 楽曲番号
 * @param {String} _mes メッセージ
 */
const selectMusicLogger = (_num, _mes = `抽選結果`) => {
    logger(`${_mes}: ${_num} / ${makeTitleStr(g_playlist[_num])}`);
};

/**
 * @description ログ出力<br />
 * ログを出力します。<br />
 * @param {String} _str ログ文章
 */
const logger = (_str) => {
    if (g_testFlg) {
        console.log(_str);
    }
};
