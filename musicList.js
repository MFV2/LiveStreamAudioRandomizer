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

			// [省略可] 収録アルバムのジャケット画像ファイル名
			artwork: `sampleImage.png`,

			// [省略可 (省略時: 100)] 個別音量調整(0～100)
			volume: 100,
			// ※100以上も指定可ですが、HTMLのaudio要素で100を超えると仕様上エラーになるため、
			// 100以上を指定している楽曲がある場合、最大値を100まで下げた後に
			// 他の曲の音量も相対的に下げて擬似的に100以上を指定した状態にします。
			// (e.g.: 音量200を指定した楽曲が1つあり、その他が音量100の場合、
			// 音量200の楽曲を音量100に変更、その他の楽曲を音量50として設定します)
			// (つまり100を超えた数値を指定している場合、超えた分だけ全体の音量が下がります)
		},
	*************************************************************/
	/** 通常選択リスト<br />
	 * 特に指定がない場合や、存在しないリスト名を指定した場合、このリストが選ばれます。<br />
	 * 【！】ここを消したり空にしたりすると多分バグリ散らかします。<br />
	 */
	default: [
		{
			url: `haruNoKyoshitsu.mp3`,
			title: `春の教室`,
			artist: `OtoLogic`,
			artwork: `sampleImage.png`,
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
