(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
	'use strict';

	var table = [],
		poly = 0xEDB88320; // reverse polynomial

	// build the table
	function makeTable() {
		var c, n, k;

		for (n = 0; n < 256; n += 1) {
			c = n;
			for (k = 0; k < 8; k += 1) {
				if (c & 1) {
					c = poly ^ (c >>> 1);
				} else {
					c = c >>> 1;
				}
			}
			table[n] = c >>> 0;
		}
	}

	function strToArr(str) {
		// sweet hack to turn string into a 'byte' array
		return Array.prototype.map.call(str, function (c) {
			return c.charCodeAt(0);
		});
	}

	/*
	 * Compute CRC of array directly.
	 *
	 * This is slower for repeated calls, so append mode is not supported.
	 */
	function crcDirect(arr) {
		var crc = -1, // initial contents of LFBSR
			i, j, l, temp;

		for (i = 0, l = arr.length; i < l; i += 1) {
			temp = (crc ^ arr[i]) & 0xff;

			// read 8 bits one at a time
			for (j = 0; j < 8; j += 1) {
				if ((temp & 1) === 1) {
					temp = (temp >>> 1) ^ poly;
				} else {
					temp = (temp >>> 1);
				}
			}
			crc = (crc >>> 8) ^ temp;
		}

		// flip bits
		return crc ^ -1;
	}

	/*
	 * Compute CRC with the help of a pre-calculated table.
	 *
	 * This supports append mode, if the second parameter is set.
	 */
	function crcTable(arr, append) {
		var crc, i, l;

		// if we're in append mode, don't reset crc
		// if arr is null or undefined, reset table and return
		if (typeof crcTable.crc === 'undefined' || !append || !arr) {
			crcTable.crc = 0 ^ -1;

			if (!arr) {
				return;
			}
		}

		// store in temp variable for minor speed gain
		crc = crcTable.crc;

		for (i = 0, l = arr.length; i < l; i += 1) {
			crc = (crc >>> 8) ^ table[(crc ^ arr[i]) & 0xff];
		}

		crcTable.crc = crc;

		return crc ^ -1;
	}

	// build the table
	// this isn't that costly, and most uses will be for table assisted mode
	makeTable();

	module.exports = function (val, direct) {
		var val = (typeof val === 'string') ? strToArr(val) : val,
			ret = direct ? crcDirect(val) : crcTable(val);

		// convert to 2's complement hex
		return (ret >>> 0).toString(16);
	};
	module.exports.direct = crcDirect;
	module.exports.table = crcTable;
}());

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
module.exports = require('./lib/');

},{"./lib/":4}],4:[function(require,module,exports){
(function() {
    'use strict';

    /**
     * getSlug
     * @param  {string} input input string
     * @param  {object|string} opts config object or separator string/char
     * @api public
     * @return {string}  sluggified string
     */
    var getSlug = function getSlug(input, opts) {

        var maintainCase = (typeof opts === 'object' && opts.maintainCase) || false;
        var titleCase = (typeof opts === 'object' && opts.titleCase) ? opts.titleCase : false;
        var customReplacements = (typeof opts === 'object' && typeof opts.custom === 'object' && opts.custom) ? opts.custom : {};
        var separator = (typeof opts === 'object' && opts.separator) || '-';
        var truncate = (typeof opts === 'object' && +opts.truncate > 1 && opts.truncate) || false;
        var uricFlag = (typeof opts === 'object' && opts.uric) || false;
        var uricNoSlashFlag = (typeof opts === 'object' && opts.uricNoSlash) || false;
        var markFlag = (typeof opts === 'object' && opts.mark) || false;
        var symbol = (typeof opts === 'object' && opts.lang && symbolMap[opts.lang]) ? symbolMap[opts.lang] : (typeof opts === 'object' && (opts.lang === false || opts.lang === true) ? {} : symbolMap.en);
        var uricChars = [';', '?', ':', '@', '&', '=', '+', '$', ',', '/'];
        var uricNoSlashChars = [';', '?', ':', '@', '&', '=', '+', '$', ','];
        var markChars = ['.', '!', '~', '*', '\'', '(', ')'];
        var result = '';
        var lucky;
        var allowedChars = separator;
        var i;
        var ch;
        var l;
        var lastCharWasSymbol;

        if (titleCase && typeof titleCase.length === "number" && Array.prototype.toString.call(titleCase)) {

            // custom config is an Array, rewrite to object format
            titleCase.forEach(function(v) {
                customReplacements[v + ""] = v + "";
            });
        }

        if (typeof input !== 'string') {
            return '';
        }

        if (typeof opts === 'string') {
            separator = opts;
        } else if (typeof opts === 'object') {

            if (uricFlag) {
                allowedChars += uricChars.join('');
            }

            if (uricNoSlashFlag) {
                allowedChars += uricNoSlashChars.join('');
            }

            if (markFlag) {
                allowedChars += markChars.join('');
            }
        }

        // custom replacements
        Object.keys(customReplacements).forEach(function(v) {

            var r;

            if (v.length > 1) {
                r = new RegExp('\\b' + escapeChars(v) + '\\b', 'gi');
            } else {
                r = new RegExp(escapeChars(v), 'gi');
            }

            input = input.replace(r, customReplacements[v]);
        });

        if (titleCase) {
            input = input.replace(/(\w)(\S*)/g, function(_, i, r) {
                var j = i.toUpperCase() + (r !== null ? r : "");
                return (Object.keys(customReplacements).indexOf(j.toLowerCase()) < 0) ? j : j.toLowerCase();
            });
        }

        // escape all necessary chars
        allowedChars = escapeChars(allowedChars);

        // trim whitespaces
        input = input.replace(/(^\s+|\s+$)/g, '');

        lastCharWasSymbol = false;
        for (i = 0, l = input.length; i < l; i++) {

            ch = input[i];

            if (charMap[ch]) {

                // process diactrics chars
                ch = lastCharWasSymbol && charMap[ch].match(/[A-Za-z0-9]/) ? ' ' + charMap[ch] : charMap[ch];

                lastCharWasSymbol = false;
            } else if (

                // process symbol chars
                symbol[ch] && !(uricFlag && uricChars.join('').indexOf(ch) !== -1) && !(uricNoSlashFlag && uricNoSlashChars.join('').indexOf(ch) !== -1) && !(markFlag && markChars.join('').indexOf(ch) !== -1)) {

                ch = lastCharWasSymbol || result.substr(-1).match(/[A-Za-z0-9]/) ? separator + symbol[ch] : symbol[ch];
                ch += input[i + 1] !== void 0 && input[i + 1].match(/[A-Za-z0-9]/) ? separator : '';

                lastCharWasSymbol = true;
            } else {

                // process latin chars
                if (lastCharWasSymbol && (/[A-Za-z0-9]/.test(ch) || result.substr(-1).match(/A-Za-z0-9]/))) {
                    ch = ' ' + ch;
                }
                lastCharWasSymbol = false;
            }

            // add allowed chars
            result += ch.replace(new RegExp('[^\\w\\s' + allowedChars + '_-]', 'g'), separator);
        }

        // eliminate duplicate separators
        // add separator
        // trim separators from start and end
        result = result.replace(/\s+/g, separator)
            .replace(new RegExp('\\' + separator + '+', 'g'), separator)
            .replace(new RegExp('(^\\' + separator + '+|\\' + separator + '+$)', 'g'), '');

        if (truncate && result.length > truncate) {

            lucky = result.charAt(truncate) === separator;
            result = result.slice(0, truncate);

            if (!lucky) {
                result = result.slice(0, result.lastIndexOf(separator));
            }
        }

        if (!maintainCase && !titleCase && !titleCase.length) {
            result = result.toLowerCase();
        }

        return result;
    };

    /**
     * createSlug curried(opts)(input)
     * @param  {object|string} opts config object or input string
     * @return {Function} function getSlugWithConfig()
     **/
    var createSlug = function createSlug(opts) {

        /**
         * getSlugWithConfig
         * @param  {string} input string
         * @return {string} slug string
         */
        return function getSlugWithConfig(input) {
            return getSlug(input, opts);
        };
    };

    var escapeChars = function escapeChars(input) {
        return input.replace(/[-\\^$*+?.()|[\]{}\/]/g, '\\$&');
    };

    /**
     * charMap
     * @type {Object}
     */
    var charMap = {
        // latin
        '??': 'A',
        '??': 'A',
        '??': 'A',
        '??': 'A',
        '??': 'Ae',
        '??': 'A',
        '??': 'AE',
        '??': 'C',
        '??': 'E',
        '??': 'E',
        '??': 'E',
        '??': 'E',
        '??': 'I',
        '??': 'I',
        '??': 'I',
        '??': 'I',
        '??': 'D',
        '??': 'N',
        '??': 'O',
        '??': 'O',
        '??': 'O',
        '??': 'O',
        '??': 'Oe',
        '??': 'O',
        '??': 'O',
        '??': 'U',
        '??': 'U',
        '??': 'U',
        '??': 'Ue',
        '??': 'U',
        '??': 'Y',
        '??': 'TH',
        '??': 'ss',
        '??': 'a',
        '??': 'a',
        '??': 'a',
        '??': 'a',
        '??': 'ae',
        '??': 'a',
        '??': 'ae',
        '??': 'c',
        '??': 'e',
        '??': 'e',
        '??': 'e',
        '??': 'e',
        '??': 'i',
        '??': 'i',
        '??': 'i',
        '??': 'i',
        '??': 'd',
        '??': 'n',
        '??': 'o',
        '??': 'o',
        '??': 'o',
        '??': 'o',
        '??': 'oe',
        '??': 'o',
        '??': 'o',
        '??': 'u',
        '??': 'u',
        '??': 'u',
        '??': 'ue',
        '??': 'u',
        '??': 'y',
        '??': 'th',
        '??': 'y',
        '???': 'SS',
        // greek
        '??': 'a',
        '??': 'b',
        '??': 'g',
        '??': 'd',
        '??': 'e',
        '??': 'z',
        '??': 'h',
        '??': '8',
        '??': 'i',
        '??': 'k',
        '??': 'l',
        '??': 'm',
        '??': 'n',
        '??': '3',
        '??': 'o',
        '??': 'p',
        '??': 'r',
        '??': 's',
        '??': 't',
        '??': 'y',
        '??': 'f',
        '??': 'x',
        '??': 'ps',
        '??': 'w',
        '??': 'a',
        '??': 'e',
        '??': 'i',
        '??': 'o',
        '??': 'y',
        '??': 'h',
        '??': 'w',
        '??': 's',
        '??': 'i',
        '??': 'y',
        '??': 'y',
        '??': 'i',
        '??': 'A',
        '??': 'B',
        '??': 'G',
        '??': 'D',
        '??': 'E',
        '??': 'Z',
        '??': 'H',
        '??': '8',
        '??': 'I',
        '??': 'K',
        '??': 'L',
        '??': 'M',
        '??': 'N',
        '??': '3',
        '??': 'O',
        '??': 'P',
        '??': 'R',
        '??': 'S',
        '??': 'T',
        '??': 'Y',
        '??': 'F',
        '??': 'X',
        '??': 'PS',
        '??': 'W',
        '??': 'A',
        '??': 'E',
        '??': 'I',
        '??': 'O',
        '??': 'Y',
        '??': 'H',
        '??': 'W',
        '??': 'I',
        '??': 'Y',
        // turkish
        '??': 's',
        '??': 'S',
        '??': 'i',
        '??': 'I',
        // '??': 'c', // duplicate
        // '??': 'C', // duplicate
        // '??': 'ue', // duplicate
        // '??': 'Ue', // duplicate
        // '??': 'oe', // duplicate
        // '??': 'Oe', // duplicate
        '??': 'g',
        '??': 'G',
        // macedonian
        '??': 'Kj',
        '??': 'kj',
        '??': 'Lj',
        '??': 'lj',
        '??': 'Nj',
        '??': 'nj',
        '????': 'Ts',
        '????': 'ts',
        // russian
        '??': 'a',
        '??': 'b',
        '??': 'v',
        '??': 'g',
        '??': 'd',
        '??': 'e',
        '??': 'yo',
        '??': 'zh',
        '??': 'z',
        '??': 'i',
        '??': 'j',
        '??': 'k',
        '??': 'l',
        '??': 'm',
        '??': 'n',
        '??': 'o',
        '??': 'p',
        '??': 'r',
        '??': 's',
        '??': 't',
        '??': 'u',
        '??': 'f',
        '??': 'h',
        '??': 'c',
        '??': 'ch',
        '??': 'sh',
        '??': 'sh',
        '??': '',
        '??': 'y',
        '??': '',
        '??': 'e',
        '??': 'yu',
        '??': 'ya',
        '??': 'A',
        '??': 'B',
        '??': 'V',
        '??': 'G',
        '??': 'D',
        '??': 'E',
        '??': 'Yo',
        '??': 'Zh',
        '??': 'Z',
        '??': 'I',
        '??': 'J',
        '??': 'K',
        '??': 'L',
        '??': 'M',
        '??': 'N',
        '??': 'O',
        '??': 'P',
        '??': 'R',
        '??': 'S',
        '??': 'T',
        '??': 'U',
        '??': 'F',
        '??': 'H',
        '??': 'C',
        '??': 'Ch',
        '??': 'Sh',
        '??': 'Sh',
        '??': '',
        '??': 'Y',
        '??': '',
        '??': 'E',
        '??': 'Yu',
        '??': 'Ya',
        // ukranian
        '??': 'Ye',
        '??': 'I',
        '??': 'Yi',
        '??': 'G',
        '??': 'ye',
        '??': 'i',
        '??': 'yi',
        '??': 'g',
        // czech
        '??': 'c',
        '??': 'd',
        '??': 'e',
        '??': 'n',
        '??': 'r',
        '??': 's',
        '??': 't',
        '??': 'u',
        '??': 'z',
        '??': 'C',
        '??': 'D',
        '??': 'E',
        '??': 'N',
        '??': 'R',
        '??': 'S',
        '??': 'T',
        '??': 'U',
        '??': 'Z',
        // polish
        '??': 'a',
        '??': 'c',
        '??': 'e',
        '??': 'l',
        '??': 'n',
        // '??': 'o', // duplicate
        '??': 's',
        '??': 'z',
        '??': 'z',
        '??': 'A',
        '??': 'C',
        '??': 'E',
        '??': 'L',
        '??': 'N',
        '??': 'S',
        '??': 'Z',
        '??': 'Z',
        // latvian
        '??': 'a',
        // '??': 'c', // duplicate
        '??': 'e',
        '??': 'g',
        '??': 'i',
        '??': 'k',
        '??': 'l',
        '??': 'n',
        // '??': 's', // duplicate
        '??': 'u',
        // '??': 'z', // duplicate
        '??': 'A',
        // '??': 'C', // duplicate
        '??': 'E',
        '??': 'G',
        '??': 'I',
        '??': 'k',
        '??': 'L',
        '??': 'N',
        // '??': 'S', // duplicate
        '??': 'U',
        // '??': 'Z', // duplicate
        // Arabic
        '??': 'a',
        '??': 'a',
        '??': 'i',
        '??': 'aa',
        '??': 'u',
        '??': 'e',
        '??': 'a',
        '??': 'b',
        '??': 't',
        '??': 'th',
        '??': 'j',
        '??': 'h',
        '??': 'kh',
        '??': 'd',
        '??': 'th',
        '??': 'r',
        '??': 'z',
        '??': 's',
        '??': 'sh',
        '??': 's',
        '??': 'dh',
        '??': 't',
        '??': 'z',
        '??': 'a',
        '??': 'gh',
        '??': 'f',
        '??': 'q',
        '??': 'k',
        '??': 'l',
        '??': 'm',
        '??': 'n',
        '??': 'h',
        '??': 'w',
        '??': 'y',
        '??': 'a',
        '??': 'h',
        '???': 'la',
        '???': 'laa',
        '???': 'lai',
        '???': 'laa',
        // Arabic diactrics
        '??': 'a',
        '??': 'an',
        '??': 'e',
        '??': 'en',
        '??': 'u',
        '??': 'on',
        '??': '',

        // Arabic numbers
        '??': '0',
        '??': '1',
        '??': '2',
        '??': '3',
        '??': '4',
        '??': '5',
        '??': '6',
        '??': '7',
        '??': '8',
        '??': '9',
        // symbols
        '???': '"',
        '???': '"',
        '???': '\'',
        '???': '\'',
        '???': 'd',
        '??': 'f',
        '???': '(TM)',
        '??': '(C)',
        '??': 'oe',
        '??': 'OE',
        '??': '(R)',
        '???': '+',
        '???': '(SM)',
        '???': '...',
        '??': 'o',
        '??': 'o',
        '??': 'a',
        '???': '*',
        // currency
        '$': 'USD',
        '???': 'EUR',
        '???': 'BRN',
        '???': 'FRF',
        '??': 'GBP',
        '???': 'ITL',
        '???': 'NGN',
        '???': 'ESP',
        '???': 'KRW',
        '???': 'ILS',
        '???': 'VND',
        '???': 'LAK',
        '???': 'MNT',
        '???': 'GRD',
        '???': 'ARS',
        '???': 'PYG',
        '???': 'ARA',
        '???': 'UAH',
        '???': 'GHS',
        '??': 'cent',
        '??': 'CNY',
        '???': 'CNY',
        '???': 'YEN',
        '???': 'IRR',
        '???': 'EWE',
        '???': 'THB',
        '???': 'INR',
        '???': 'INR',
        '???': 'PF'
    };

    /**
     * symbolMap language specific symbol translations
     * @type {Object}
     */
    var symbolMap = {

        'ar': {
            '???': 'delta',
            '???': 'la-nihaya',
            '???': 'hob',
            '&': 'wa',
            '|': 'aw',
            '<': 'aqal-men',
            '>': 'akbar-men',
            '???': 'majmou',
            '??': 'omla'
        },

        'de': {
            '???': 'delta',
            '???': 'unendlich',
            '???': 'Liebe',
            '&': 'und',
            '|': 'oder',
            '<': 'kleiner als',
            '>': 'groesser als',
            '???': 'Summe von',
            '??': 'Waehrung'
        },

        'en': {
            '???': 'delta',
            '???': 'infinity',
            '???': 'love',
            '&': 'and',
            '|': 'or',
            '<': 'less than',
            '>': 'greater than',
            '???': 'sum',
            '??': 'currency'
        },

        'es': {
            '???': 'delta',
            '???': 'infinito',
            '???': 'amor',
            '&': 'y',
            '|': 'u',
            '<': 'menos que',
            '>': 'mas que',
            '???': 'suma de los',
            '??': 'moneda'
        },

        'fr': {
            '???': 'delta',
            '???': 'infiniment',
            '???': 'Amour',
            '&': 'et',
            '|': 'ou',
            '<': 'moins que',
            '>': 'superieure a',
            '???': 'somme des',
            '??': 'monnaie'
        },

        'pt': {
            '???': 'delta',
            '???': 'infinito',
            '???': 'amor',
            '&': 'e',
            '|': 'ou',
            '<': 'menor que',
            '>': 'maior que',
            '???': 'soma',
            '??': 'moeda'
        },

        'ru': {
            '???': 'delta',
            '???': 'beskonechno',
            '???': 'lubov',
            '&': 'i',
            '|': 'ili',
            '<': 'menshe',
            '>': 'bolshe',
            '???': 'summa',
            '??': 'valjuta'
        }
    };

    if (typeof module !== 'undefined' && module.exports) {

        // export functions for use in Node
        module.exports = getSlug;
        module.exports.createSlug = createSlug;

    } else if (typeof define !== 'undefined' && define.amd) {

        // export function for use in AMD
        define([], function() {
            return getSlug;
        });

    } else {
        // don't overwrite global if exists
        try {
            if (window.getSlug || window.createSlug) {
                throw 'speakingurl: globals exists /(getSlug|createSlug)/';
            } else {
                window.getSlug = getSlug;
                window.createSlug = createSlug;
            }
        } catch (e) {}

    }
})();

},{}],5:[function(require,module,exports){
"use strict";
var pluralize = require("./pluralize")["default"] || require("./pluralize");
var Utils = require("./utils")["default"] || require("./utils");
var I18nliner = require("./i18nliner")["default"] || require("./i18nliner");
var getSlug = require("speakingurl")["default"] || require("speakingurl");
var crc32 = require("crc32")["default"] || require("crc32");

var CallHelpers = {
  ALLOWED_PLURALIZATION_KEYS: ["zero", "one", "few", "many", "other"],
  REQUIRED_PLURALIZATION_KEYS: ["one", "other"],
  UNSUPPORTED_EXPRESSION: [],

  normalizeKey: function(key) {
    return key;
  },

  normalizeDefault: function(defaultValue, translateOptions) {
    defaultValue = CallHelpers.inferPluralizationHash(defaultValue, translateOptions);
    return defaultValue;
  },

  inferPluralizationHash: function(defaultValue, translateOptions) {
    if (typeof defaultValue === 'string' && defaultValue.match(/^[\w-]+$/) && translateOptions && ("count" in translateOptions)) {
      return {one: "1 " + defaultValue, other: "%{count} " + pluralize(defaultValue)};
    }
    else {
      return defaultValue;
    }
  },

  isObject: function(object) {
    return typeof object === 'object' && object !== this.UNSUPPORTED_EXPRESSION;
  },

  validDefault: function(allowBlank) {
    var defaultValue = this.defaultValue;
    return allowBlank && (typeof defaultValue === 'undefined' || defaultValue === null) ||
      typeof defaultValue === 'string' ||
      this.isObject(defaultValue);
  },

  inferKey: function(defaultValue, translateOptions) {
    if (this.validDefault(defaultValue)) {
      defaultValue = this.normalizeDefault(defaultValue, translateOptions);
      if (typeof defaultValue === 'object')
        defaultValue = "" + defaultValue.other;
      return this.keyify(defaultValue);
    }
  },

  keyifyUnderscored: function(string) {
    var key = getSlug(string, {separator: '_', lang: false}).replace(/[-_]+/g, '_');
    return key.substring(0, I18nliner.underscoredKeyLength);
  },

  keyifyUnderscoredCrc32: function(string) {
    var checksum = crc32(string.length + ":" + string).toString(16);
    return this.keyifyUnderscored(string) + "_" + checksum;
  },

  keyify: function(string) {
    switch (I18nliner.inferredKeyFormat) {
      case 'underscored':
        return this.keyifyUnderscored(string);
      case 'underscored_crc32':
        return this.keyifyUnderscoredCrc32(string);
      default:
        return string;
    }
  },

  keyPattern: /^(\w+\.)+\w+$/,

  /**
   * Possible translate signatures:
   *
   * key [, options]
   * key, default_string [, options]
   * key, default_object, options
   * default_string [, options]
   * default_object, options
   **/
  isKeyProvided: function(keyOrDefault, defaultOrOptions, maybeOptions) {
    if (typeof keyOrDefault === 'object')
      return false;
    if (typeof defaultOrOptions === 'string')
      return true;
    if (maybeOptions)
      return true;
    if (typeof keyOrDefault === 'string' && keyOrDefault.match(CallHelpers.keyPattern))
      return true;
    return false;
  },

  isPluralizationHash: function(object) {
    var pKeys;
    return this.isObject(object) &&
      (pKeys = Utils.keys(object)) &&
      pKeys.length > 0 &&
      Utils.difference(pKeys, this.ALLOWED_PLURALIZATION_KEYS).length === 0;
  },

  inferArguments: function(args, meta) {
    if (args.length === 2 && typeof args[1] === 'object' && args[1].defaultValue)
      return args;

    var hasKey = this.isKeyProvided.apply(this, args);
    if (meta)
      meta.inferredKey = !hasKey;
    if (!hasKey)
      args.unshift(null);

    var defaultValue = null;
    var defaultOrOptions = args[1];
    if (args[2] || typeof defaultOrOptions === 'string' || this.isPluralizationHash(defaultOrOptions))
      defaultValue = args.splice(1, 1)[0];
    if (args.length === 1)
      args.push({});
    var options = args[1];
    if (defaultValue)
      options.defaultValue = defaultValue;
    if (!hasKey)
      args[0] = this.inferKey(defaultValue, options);
    return args;
  },

  applyWrappers: function(string, wrappers) {
    var i;
    var len;
    var keys;
    if (typeof wrappers === 'string')
      wrappers = [wrappers];
    if (wrappers instanceof Array) {
      for (i = wrappers.length; i; i--)
        string = this.applyWrapper(string, new Array(i + 1).join("*"), wrappers[i - 1]);
    }
    else {
      keys = Utils.keys(wrappers);
      keys.sort(function(a, b) { return b.length - a.length; }); // longest first
      for (i = 0, len = keys.length; i < len; i++)
        string = this.applyWrapper(string, keys[i], wrappers[keys[i]]);
    }
    return string;
  },

  applyWrapper: function(string, delimiter, wrapper) {
    var escapedDelimiter = Utils.regexpEscape(delimiter);
    var pattern = new RegExp(escapedDelimiter + "(.*?)" + escapedDelimiter, "g");
    return string.replace(pattern, wrapper);
  }
};

exports["default"] = CallHelpers;
},{"./i18nliner":8,"./pluralize":9,"./utils":10,"crc32":1,"speakingurl":3}],6:[function(require,module,exports){
"use strict";
var CallHelpers = require("../call_helpers")["default"] || require("../call_helpers");
var Utils = require("../utils")["default"] || require("../utils");

var extend = function(I18n) {
  var htmlEscape = Utils.htmlEscape;

  I18n.interpolateWithoutHtmlSafety = I18n.interpolate;
  I18n.interpolate = function(message, options) {
    var needsEscaping = false;
    var matches = message.match(this.PLACEHOLDER) || [];
    var len = matches.length;
    var match;
    var keys = [];
    var key;
    var i;
    var wrappers = options.wrappers || options.wrapper;

    if (wrappers) {
      needsEscaping = true;
      message = htmlEscape(message);
      message = CallHelpers.applyWrappers(message, wrappers);
    }

    for (i = 0; i < len; i++) {
      match = matches[i];
      key = match.replace(this.PLACEHOLDER, "$1");
      keys.push(key);
      if (!(key in options)) continue;
      if (match[1] === 'h')
        options[key] = new Utils.HtmlSafeString(options[key]);
      if (options[key] instanceof Utils.HtmlSafeString)
        needsEscaping = true;
    }

    if (needsEscaping) {
      if (!wrappers)
        message = htmlEscape(message);
      for (i = 0; i < len; i++) {
        key = keys[i];
        if (!(key in options)) continue;
        options[key] = htmlEscape(options[key]);
      }
    }
    message = this.interpolateWithoutHtmlSafety(message, options);
    return needsEscaping ? new Utils.HtmlSafeString(message) : message;
  };

  // add html-safety hint, i.e. "%h{...}"
  I18n.PLACEHOLDER = /(?:\{\{|%h?\{)(.*?)(?:\}\}?)/gm;

  I18n.CallHelpers = CallHelpers;
  I18n.Utils = Utils;

  I18n.translateWithoutI18nliner = I18n.translate;
  I18n.translate = function() {
    var args = CallHelpers.inferArguments([].slice.call(arguments));
    var key = args[0];
    var options = args[1];
    key = CallHelpers.normalizeKey(key, options);
    var defaultValue = options.defaultValue;
    if (defaultValue)
      options.defaultValue = CallHelpers.normalizeDefault(defaultValue, options);

    return this.translateWithoutI18nliner(key, options);
  };
  I18n.t = I18n.translate;
};

exports["default"] = extend;
},{"../call_helpers":5,"../utils":10}],7:[function(require,module,exports){
"use strict";
/* global I18n */
var extend = require("./i18n_js")["default"] || require("./i18n_js");
extend(I18n);
},{"./i18n_js":6}],8:[function(require,module,exports){
"use strict";
var fs = require("fs")["default"] || require("fs");

var I18nliner = {
  ignore: function() {
    var ignores = [];
    if (fs.existsSync(".i18nignore")) {
      ignores = fs.readFileSync(".i18nignore").toString().trim().split(/\r?\n|\r/);
    }
    return ignores;
  },
  set: function(key, value, fn) {
    var prevValue = this[key];
    this[key] = value;
    if (fn) {
      try {
        fn();
      }
      finally {
        this[key] = prevValue;
      }
    }
  },
  inferredKeyFormat: 'underscored_crc32',
  underscoredKeyLength: 50,
  basePath: "."
};
exports["default"] = I18nliner;
},{"fs":2}],9:[function(require,module,exports){
"use strict";
// ported pluralizations from active_support/inflections.rb
// (except for cow -> kine, because nobody does that) 
var skip = ['equipment', 'information', 'rice', 'money', 'species', 'series', 'fish', 'sheep', 'jeans'];
var patterns = [
  [/person$/i, 'people'],
  [/man$/i, 'men'],
  [/child$/i, 'children'],
  [/sex$/i, 'sexes'],
  [/move$/i, 'moves'],
  [/(quiz)$/i, '$1zes'],
  [/^(ox)$/i, '$1en'],
  [/([m|l])ouse$/i, '$1ice'],
  [/(matr|vert|ind)(?:ix|ex)$/i, '$1ices'],
  [/(x|ch|ss|sh)$/i, '$1es'],
  [/([^aeiouy]|qu)y$/i, '$1ies'],
  [/(hive)$/i, '$1s'],
  [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
  [/sis$/i, 'ses'],
  [/([ti])um$/i, '$1a'],
  [/(buffal|tomat)o$/i, '$1oes'],
  [/(bu)s$/i, '$1ses'],
  [/(alias|status)$/i, '$1es'],
  [/(octop|vir)us$/i, '$1i'],
  [/(ax|test)is$/i, '$1es'],
  [/s$/i, 's']
];

var pluralize = function(string) {
  string = string || '';
  if (skip.indexOf(string) >= 0) {
    return string;
  }
  for (var i = 0, len = patterns.length; i < len; i++) {
    var pair = patterns[i];
    if (string.match(pair[0])) {
      return string.replace(pair[0], pair[1]);
    }
  }
  return string + "s";
};

pluralize.withCount = function(count, string) {
  return "" + count + " " + (count === 1 ? string : pluralize(string));
};

exports["default"] = pluralize;
},{}],10:[function(require,module,exports){
"use strict";
var htmlEntities = {
  "'": "&#39;",
  "&": "&amp;",
  '"': "&quot;",
  ">": "&gt;",
  "<": "&lt;"
};

function HtmlSafeString(string) {
  this.string = (typeof string === 'string' ? string : "" + string);
}
HtmlSafeString.prototype.toString = function() {
  return this.string;
};

var Utils = {
  HtmlSafeString: HtmlSafeString,

  difference: function(a1, a2) {
    var result = [];
    for (var i = 0, len = a1.length; i < len; i++) {
      if (a2.indexOf(a1[i]) === -1)
        result.push(a1[i]);
    }
    return result;
  },

  keys: function(object) {
    var keys = [];
    for (var key in object) {
      if (object.hasOwnProperty(key))
        keys.push(key);
    }
    return keys;
  },

  htmlEscape: function(string) {
    if (typeof string === 'undefined' || string === null) return '';
    if (string instanceof Utils.HtmlSafeString) return string.toString();
    return String(string).replace(/[&<>"']/g, function(m){ return htmlEntities[m]; });
  },

  regexpEscape: function(string) {
    if (typeof string === 'undefined' || string === null) return '';
    return String(string).replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  },

  extend: function() {
    var args = [].slice.call(arguments);
    var target = args.shift();
    for (var i = 0, len = args.length; i < len; i++) {
      var source = args[i];
      for (var key in source) {
        if (source.hasOwnProperty(key))
          target[key] = source[key];
      }
    }
  }
};

exports["default"] = Utils;
},{}]},{},[7])