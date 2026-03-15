"use strict";
/**
 * @description 配信用 音源ランダム再生＆楽曲名表記システム
 * @author マムルファイターV2 / MFV2
 * @version v2.00<br />
 * 2026/03/14 / v2.00 / OBS内部ブラウザにて音源の再生が時々止まるバグの修正<br />
 * 2025/10/26 / v1.04 / コード整理, ジャケット画像表示機能追加<br />
 * 2025/08/09 / v1.03 / コード整理, テスト用機能修正、音量ノーマライズ機能追加<br />
 * 2024/09/28 / v1.02 / README更新, テスト用機能追加<br />
 * 2024/09/28 / v1.00 / 初版作成<br />
 * 2023/11/18 / v0.10 / 仮作成<br />
 */

/** テスト用フラグ */
const g_testFlg = document.location.href.includes(`testFlg=On`);
/** 楽曲格納フォルダ名 */
const g_musicFolder = `music/`;
/** ジャケット画像格納フォルダ名 */
const g_artworkFolder = `artwork/`;
/** 楽曲リスト保存用 */
let g_playlist = [];
/** 再生用Audio(1つだけ使用する) */
let g_audio = new Audio();
/** 楽曲ボリューム基本設定 */
let g_baseVol = g_testFlg ? 15 : 100;
/** 現在再生中の曲番号 */
let g_nowIndex = null;

/**
 * @description ページ読み込み完了時実行関数<br />
 * HTML内の要素を読み出しきった時に実行するメイン関数です。<br />
 */
const onHtmlLoad = () => {
	// css記述を動的に書き出しする。
	cssSet();

	// 曲終了時イベントを設定する。
	g_audio.addEventListener(`ended`, () => {
		executeNextMusicSelect();
	});

	// 楽曲リストを取得する。
	g_playlist = getMusicList();

	// 初回に再生する楽曲を選択する。
	const firstNum = Math.floor(Math.random() * g_playlist.length);
	executePlayMusic(firstNum);

	// テスト再生用要素を作成する。
	createTestElemList(firstNum);

	// テスト用ログを出力する。
	selectMusicLogger(firstNum, `抽選結果(初回)`);
};

/**
 *
 * @description 楽曲リスト取得<br />
 * 楽曲リストを取得します。<br />
 * @return {Array<Object>} プレイリスト
 */
const getMusicList = () => {
	// URLパラメータからプレイリスト名を取得する。
	const url = new URL(document.location.href);
	const param = url.searchParams;
	let scene = param.get(`scene`);

	// URLパラメータが存在しない場合、HTMLファイル名をプレイリスト名にする。
	if (!scene) {
		// 現在のページのパスを取得し、ファイル名を抽出する。
		const path = globalThis.location.pathname;
		const fileName = path.substring(path.lastIndexOf(`/`) + 1);
		scene = fileName.split(`.`)[0];
	}

	// 存在しないプレイリスト名の場合はプレイリスト名を`default`にする。
	// defaultのプレイリストを空にした場合の考慮は放棄する。
	// 変な使い方をする人は動作保証外とします。
	if (!g_musicList[scene]) {
		scene = `default`;
	}

	// 楽曲リストを取得する。
	let playlist = g_musicList[scene];

	// 楽曲リストをソートする。
	playlist.sort((_lh, _rh) => {
		// 【ソート仕様】
		// ・作曲者名+楽曲名 を連結して文字列ソートを行う。
		// ・大文字小文字を無視する。
		const lhStr = _lh.artist.toUpperCase() + _lh.title.toUpperCase();
		const rhStr = _rh.artist.toUpperCase() + _rh.title.toUpperCase();
		if (lhStr < rhStr) {
			return -1;
		}
		return 1;
	});

	// 楽曲リスト内の番号を定義する。
	playlist.forEach((_obj, _idx) => {
		playlist[_idx].num = _idx;
	});

	// 楽曲リスト内で一番大きい音量を取得し、
	// 最大値を100に変更し、それ以外を相対的に音量を下げる。
	return normalizeVolumes(playlist);
};

/**
 * @description 楽曲リストvolume相対調整
 * 楽曲リストのvolumeを最大値100になるように相対調整します。<br/>
 * volumeが無い場合はデフォルト値100として扱います。
 * @param {Array<Object>} _playlist 楽曲リスト
 * @return {Array<Object>} volume調整後の楽曲リスト(元の配列を変更します)
 */
const normalizeVolumes = (_playlist) => {
	// 楽曲リスト内のvolume最大値を取得する。(取得できない場合、100とする)
	const defaultMaxVolume = 100;
	const maxVolume = Math.max(
		..._playlist.map((_item) => {
			return _item.volume ?? defaultMaxVolume;
		}),
	);

	// volume最大値が100を超えない場合、何もせず返却する。
	if (maxVolume <= defaultMaxVolume) {
		return _playlist;
	}

	// 楽曲リストの全てのvolumeを最大値100にスケーリングする。
	_playlist.forEach((_item) => {
		const vol = _item.volume ?? defaultMaxVolume;
		_item.volume = (vol / maxVolume) * defaultMaxVolume;
	});

	return _playlist;
};

/**
 * @description 初回以降再生楽曲選択<br />
 * 初回以降に再生する楽曲を選択します。<br />
 */
const executeNextMusicSelect = () => {
	// 再生済み楽曲数をカウントする。
	const completedCnt = g_playlist.filter((_obj) => _obj.play).length;

	// 全ての楽曲が再生済みになったら、全て再生フラグをfalseにリセットする。
	if (completedCnt == g_playlist.length) {
		for (const obj of g_playlist) {
			obj.play = false;
		}
	}

	// 未再生の楽曲番号一覧を作成する。
	const numList = [];
	for (const obj of g_playlist) {
		// 再生済フラグが立っている場合は処理スキップ。
		if (obj.play) {
			continue;
		}
		// 現在再生中の楽曲番号の場合は処理スキップ。
		// 通常はこの分岐に入ることはないが、
		// 全楽曲を再生し終わって全楽曲の再生フラグをリセットした時のみ、
		// 同曲連続再生がありえるためこの分岐で阻止する。
		if (obj.num == g_nowIndex) {
			continue;
		}

		// 未再生の楽曲番号一覧に楽曲番号を追加する。
		numList.push(obj.num);
	}

	// 未再生の楽曲番号一覧から抽選する。
	const rand = Math.floor(Math.random() * numList.length);
	const num = numList[rand];

	// 楽曲を再生する。
	executePlayMusic(num);

	// テスト用ログを出力する。
	logger.log(`// ---------------------------------------`);
	logger.log(`抽選済: ${completedCnt}曲`);
	logger.log(`未再生の楽曲番号一覧: ${numList}`);
	selectMusicLogger(num);
	logger.log(g_playlist);
};

/**
 * @description 指定楽曲再生<br />
 * 指定した楽曲を再生します。<br />
 * @param {Number} _num 楽曲番号
 */
const executePlayMusic = async (_num) => {
	const obj = g_playlist[_num];

	// 既存の楽曲の再生を停止する。
	g_audio.pause();

	// 選択された楽曲の再生フラグをtrueにする。
	g_playlist[_num].play = true;
	g_nowIndex = _num;

	// 選択された楽曲に切り替える。
	g_audio.src = `${g_musicFolder}${obj.url}`;
	g_audio.volume = getAudioVolume(_num);
	g_audio.load();

	// 再生可能になるまで待機する。
	await waitCanPlay(g_audio);

	try {
		// テスト用フラグが立っている場合、再生中の楽曲名の背景色に色を付ける。
		const titleDivElemList = document.querySelectorAll(`.testMusicName`);
		titleDivElemList.forEach((_elem) => {
			_elem.classList.remove(`nowPlay`);
		});
		const titleDivElem = document.getElementById(`testMusicName${_num}`);
		if (titleDivElem) {
			titleDivElem.classList.add(`nowPlay`);
		}

		// 楽曲名テキストの表示を更新する。
		refreshCreditView(_num);

		// 次曲を再生する。
		await g_audio.play();
	} catch (_err) {
		// 再生失敗時の場合、エラーログを出力する。
		logger.error(`再生失敗`, _err);
	}
};

/**
 * @description 音声再生可能待機処理<br />
 * audioが再生可能になるまで待機します。<br />
 * @param {HTMLAudioElement} _audio audio要素
 * @return {Promise<Void>}
 */
const waitCanPlay = (_audio) => {
	return new Promise((_resolve) => {
		// 既に再生可能
		if (_audio.readyState >= 3) {
			return _resolve();
		}

		// canplay待機
		_audio.addEventListener(
			`canplay`,
			() => {
				_resolve();
			},
			{ once: true },
		);
	});
};

/**
 * @description 楽曲名テキスト表示更新<br />
 * 楽曲名テキストの表示を更新します。<br />
 * @param {Number} _num 楽曲番号
 */
const refreshCreditView = (_num) => {
	const titleElem = document.getElementById(`title`);

	// 楽曲名表示の更新を行う。
	// タイマーを利用してdiv要素のクラスを順番に入れ替える。
	wait(0.2)
		.then(() => {
			// 前曲の楽曲名表記を徐々に消すクラスを設定する。
			titleElem.classList.add(`fadeOut`);

			return wait(0.2);
		})
		.then(() => {
			// 前曲の楽曲名表記を徐々に消すクラスを削除する。
			titleElem.classList.remove(`fadeOut`);

			// 楽曲名更新/次曲の楽曲名表記が長い場合はスクロールするクラスを設定する。
			setCreditScroll(_num);

			// 次曲の楽曲名表記を徐々に表示するクラスを設定する。
			titleElem.classList.add(`fadeIn`);

			return wait(0.2);
		})
		.then(() => {
			// 次曲の楽曲名表記を徐々に表示するクラスを削除する。
			titleElem.classList.remove(`fadeIn`);
		});
};

/**
 * @description 楽曲音量取得<br />
 * 楽曲再生時の音量設定を取得します。<br />
 * @param {Number} _num 楽曲番号
 * @return {Number} 音量
 */
const getAudioVolume = (_num) => {
	let musicVol = 100;
	// 楽曲毎個別音量設定を取得する。
	if (g_playlist[_num].volume) {
		musicVol = g_playlist[_num].volume;
	}

	return (musicVol / 100) * (g_baseVol / 100);
};

/**
 * @description 楽曲名テキストスクロール設定<br />
 * 楽曲名テキストのスクロールを設定します。<br />
 * @param {Number} _num 楽曲番号
 */
const setCreditScroll = async (_num) => {
	const obj = g_playlist[_num];

	const titleElem = document.getElementById(`title`);
	const scrollElem = document.getElementById(`scroll`);
	const spanId = `music${_num}span`;
	const title = createTitleStr(obj);

	// 要素の配下を全て削除する。
	scrollElem.innerHTML = ``;

	// 楽曲名テキストを更新する。
	const spanElem = document.createElement(`span`);
	spanElem.id = spanId;
	spanElem.classList.add(`musicName`);
	scrollElem.appendChild(spanElem);

	const musicNameElem = document.createElement(`span`);
	musicNameElem.textContent = title;
	spanElem.prepend(musicNameElem);

	// 楽曲名テキストの横幅を取得する。
	let offsetWidth = musicNameElem.offsetWidth;
	let offsetHeight = titleElem.offsetHeight;

	// ジャケット画像がある場合は取得する。
	const imgElem = await getArtworkImage(obj);
	if (imgElem) {
		imgElem.height = offsetHeight;
		spanElem.prepend(imgElem);
		offsetWidth += offsetHeight;
	}

	scrollElem.style.width = `${offsetWidth}px`;

	// 楽曲名テキストの横幅が、ウィンドウの横幅より大きい場合はHTML要素にクラスを設定する。
	const className = `musicSelectorScroll`;
	scrollElem.classList.remove(className);
	if (window.innerWidth < offsetWidth) {
		scrollElem.classList.add(className);
	}
};

/**
 * @description 楽曲名テキスト作成<br />
 * 楽曲名/作曲者名の表記を行うためのテキスト文を作成します。<br />
 * @param {Object} _obj 楽曲情報オブジェクト
 * @return {String} 楽曲名テキスト
 */
const createTitleStr = (_obj) => {
	let title = `♪${_obj.title} / ${_obj.artist}`;

	// 収録アルバム名が定義されている場合は文章に追加する。
	if (_obj.from) {
		title += ` / from: ${_obj.from}`;
	}

	return title;
};

/**
 * @description ジャケット画像取得<br />
 * ジャケット画像を取得し、HTMLImageElementを作成します。<br />
 * @param {Object} _obj 楽曲情報オブジェクト
 * @return {Promise<HTMLImageElement|null>} ジャケット画像(なければnull)
 */
const getArtworkImage = async (_obj) => {
	if (!_obj.artwork) return null;

	// <img>要素を作成して返却する。
	const url = `${g_artworkFolder}${_obj.artwork}`;
	const img = new Image();
	img.src = url;
	return img;
};

/**
 * @description css記述動的書き出し<br />
 * css記述を動的に書き出します。<br />
 */
const cssSet = () => {
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
 * @description テスト再生用要素作成<br />
 * テスト用楽曲コントロールUIを作成します。<br />
 * @param {Number} _num 楽曲番号
 */
const createTestElemList = (_num) => {
	// テスト用フラグが立っていない場合、処理を終了する。
	if (!g_testFlg) return;

	// テスト用フラグが立っている場合、テスト再生用の要素を作成する。

	// 楽曲再生用のHTML要素を格納するdiv要素を作成する。
	const boxDivElem = document.getElementById(`list`);

	// 楽曲終了用のHTML要素を作成する。
	const skipPos = 95;
	const skipBtnElem = document.createElement(`button`);
	skipBtnElem.textContent = `現在の音源を終了`;
	skipBtnElem.addEventListener(`click`, () => {
		if (!g_audio.duration) return;
		g_audio.currentTime = (g_audio.duration * skipPos) / 100;
	});

	// 一時停止/再生ボタンを作成する。
	const toggleBtnElem = document.createElement(`button`);
	toggleBtnElem.textContent = `一時停止`;
	toggleBtnElem.addEventListener(`click`, async () => {
		if (!g_audio) return;

		// 停止中の場合 → 再生
		if (g_audio.paused) {
			await g_audio.play();
			toggleBtnElem.textContent = `一時停止`;
		}
		// 再生中の場合 → 一時停止
		else {
			g_audio.pause();
			toggleBtnElem.textContent = `　再生　`;
		}
	});

	// 音量ラベル要素を作成する。
	const volumeLabelElem = document.createElement(`span`);
	volumeLabelElem.textContent = `音量`;

	// 音量スライダー要素を作成する。
	const volumeSliderElem = document.createElement(`input`);
	volumeSliderElem.id = `volumeSlider`;
	volumeSliderElem.type = `range`;
	volumeSliderElem.min = 0;
	volumeSliderElem.max = 100;
	volumeSliderElem.value = g_baseVol;

	// 音量変更イベントを設定する。
	volumeSliderElem.addEventListener(`input`, (_event) => {
		if (!g_audio) return;

		const volume = Number(_event.target.value);

		g_baseVol = volume;
		g_audio.volume = getAudioVolume(g_nowIndex);
	});

	// 操作ボタンラッパー要素を作成する。
	const skipBtnWrapElem = document.createElement(`div`);
	skipBtnWrapElem.classList.add(`wrap`);
	skipBtnWrapElem.appendChild(skipBtnElem);
	skipBtnWrapElem.appendChild(toggleBtnElem);
	skipBtnWrapElem.appendChild(volumeLabelElem);
	skipBtnWrapElem.appendChild(volumeSliderElem);
	boxDivElem.appendChild(skipBtnWrapElem);

	// 楽曲一覧を作成する。
	g_playlist.forEach((_obj, _idx) => {
		// 楽曲名表記用のHTML要素を作成する。
		const titleDivElem = document.createElement(`div`);
		titleDivElem.innerHTML = createTitleStr(_obj);
		titleDivElem.id = `testMusicName${_idx}`;
		titleDivElem.classList.add(`testMusicName`);

		// 最初に再生する楽曲名の背景色に色を付ける。
		if (_idx == _num) {
			titleDivElem.classList.add(`nowPlay`);
		}
		boxDivElem.appendChild(titleDivElem);

		// 楽曲再生用のHTML要素を作成する。
		const playBtnElem = document.createElement(`button`);
		playBtnElem.textContent = `再生`;

		playBtnElem.addEventListener(`click`, () => {
			executePlayMusic(_idx);
		});

		const wrapElem = document.createElement(`div`);
		wrapElem.classList.add(`wrap`);
		wrapElem.appendChild(playBtnElem);
		wrapElem.appendChild(titleDivElem);
		boxDivElem.appendChild(wrapElem);
	});
};

/**
 * @description 指定秒数待機Promise作成<br />
 * 指定秒数待機する Promise を返します。<br />
 * @param {Number} _seconds 待機秒数
 * @return {Promise<void>} 指定秒数後に実行される Promise
 */
const wait = (_seconds) => {
	return new Promise((_resolve) => {
		setTimeout(_resolve, _seconds * 1000);
	});
};

/**
 * @description 楽曲名ログ出力<br />
 * 楽曲名ログを出力します。<br />
 * @param {Number} _num 楽曲番号
 * @param {String} [_mes = `抽選結果`] メッセージ
 */
const selectMusicLogger = (_num, _mes = `抽選結果`) => {
	logger.log(`${_mes}: ${_num} / ${createTitleStr(g_playlist[_num])}`);
};

/**
 * @description ログ出力<br />
 * ログを出力します。<br />
 * @param {String} _str ログ文章
 */
const logger = {
	/**
	 * @description ログ出力<br/>
	 */
	log(..._args) {
		if (g_testFlg) console.log(`[DEBUG]`, ..._args);
	},

	/**
	 * @description 警告ログ出力<br/>
	 */
	warn(..._args) {
		if (g_testFlg) console.warn(`[DEBUG]`, ..._args);
	},

	/**
	 * @description エラーログ出力<br/>
	 */
	error(..._args) {
		if (g_testFlg) console.error(`[DEBUG]`, ..._args);
	},
};

// ==============================================================================
// ページの読み込みが完了したら実行する。
globalThis.addEventListener(`load`, () => {
	onHtmlLoad();
});
