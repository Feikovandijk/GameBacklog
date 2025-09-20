"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWishlist = getWishlist;
const axios_1 = __importDefault(require("axios"));
const STEAM_API_BASE = 'https://store.steampowered.com';
/**
 * Fetches the public wishlist for a given Steam user ID.
 * Note: This only works for public wishlists.
 * @param steamId The 64-bit Steam ID of the user.
 * @returns A promise that resolves to an array of wishlist items.
 */
function getWishlist(steamId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!steamId) {
            throw new Error('Steam ID is required to fetch a wishlist.');
        }
        // The wishlist data is paginated, so we need to fetch all pages.
        let wishlist = [];
        let page = 0;
        let moreResults = true;
        while (moreResults) {
            const url = `${STEAM_API_BASE}/wishlist/profiles/${steamId}/wishlistdata/?p=${page}`;
            try {
                const response = yield axios_1.default.get(url);
                if (response.data && typeof response.data === 'object') {
                    // If the response is an object, it contains the wishlist items.
                    const items = Object.values(response.data);
                    wishlist = wishlist.concat(items);
                    moreResults = false; // The object response contains all items.
                }
                else if (Array.isArray(response.data) && response.data.length > 0) {
                    // If the response is an array, it's a page of items.
                    wishlist = wishlist.concat(response.data);
                    page++;
                }
                else {
                    // If the response is empty or not an array/object, we're done.
                    moreResults = false;
                }
            }
            catch (error) {
                console.error(`Error fetching wishlist for steamId ${steamId}, page ${page}:`, error);
                // Stop trying if there's an error.
                moreResults = false;
            }
        }
        return wishlist;
    });
}
