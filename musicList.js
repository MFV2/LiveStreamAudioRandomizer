"use strict";

/** 楽曲リスト */
const g_musicList = {
    /*************************************************************
        // 【見本】
        {
            // ファイル名
			url: `banbards_06_plusten.mp3`,

            // 曲名
			title: `BanBit`,

            // 作曲者名
			artist: `mozell, Remix: Plusten`,

            // [省略可] 収録アルバム名など
			from: `バンバーズ`,

            // [省略可] 個別音量調整(0～100) ※仕様上100を超えるとエラーになります。
            volume: 100,
        },
    *************************************************************/
    /** 通常選択リスト<br />
     * 特に指定がない場合、存在しないリスト名を指定した場合はこのリストが選ばれます。<br />
     * 【！】ここを消したり空にしたりすると多分バグリ散らかします。<br />
     */
    default: [
        {
            url: `haruNoKyoshitsu.mp3`,
            title: `春の教室`,
            artist: `OtoLogic`,
        },
        {
            url: `moriNoFushigi.mp3`,
            title: `もりのふしぎ`,
            artist: `こんとどぅふぇ HiLi`,
        },
        {
            url: `kochaNoJikan.mp3`,
            title: `紅茶の時間`,
            artist: `甘茶の音楽工房`,
        },
        {
            url: `elecTrain.mp3`,
            title: `ElecTrain`,
            artist: `LSD_sc`,
        },
    ],
    /** エンディング用 */
    ending: [
        {
            url: `shinyaHoro.mp3`,
            title: `深夜放浪`,
            artist: `巣鴨放送局`,
        },
    ],
};
