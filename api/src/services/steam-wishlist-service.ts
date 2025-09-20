import axios from 'axios';

const STEAM_API_BASE = 'https://store.steampowered.com';

export interface WishlistItem {
  name: string;
  capsule: string;
  review_score: number;
  review_desc: string;
  reviews_total: string;
  reviews_percent: number;
  release_date: string;
  release_string: string;
  platform_icons: string;
  subs: {
    packageid: number;
    price: string;
    discount_block: string;
    discount_pct: number;
  }[];
  type: string;
  screenshots: string[];
  review_css: string;
  priority: number;
  added: number;
  background: string;
  rank: number;
  tags: string[];
  is_free_game: boolean;
  win: number;
  mac: number;
  linux: number;
  deck_compat: number;
}

/**
 * Fetches the public wishlist for a given Steam user ID.
 * Note: This only works for public wishlists.
 * @param steamId The 64-bit Steam ID of the user.
 * @returns A promise that resolves to an array of wishlist items.
 */
export async function getWishlist(
  steamId: string
): Promise<WishlistItem[]> {
  if (!steamId) {
    throw new Error('Steam ID is required to fetch a wishlist.');
  }

  // The wishlist data is paginated, so we need to fetch all pages.
  let wishlist: WishlistItem[] = [];
  let page = 0;
  let moreResults = true;

  while (moreResults) {
    const url = `${STEAM_API_BASE}/wishlist/profiles/${steamId}/wishlistdata/?p=${page}`;
    try {
      const response = await axios.get<any>(url);

      if (response.data && typeof response.data === 'object') {
        // If the response is an object, it contains the wishlist items.
        const items = Object.values(response.data) as WishlistItem[];
        wishlist = wishlist.concat(items);
        moreResults = false; // The object response contains all items.
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        // If the response is an array, it's a page of items.
        wishlist = wishlist.concat(response.data);
        page++;
      } else {
        // If the response is empty or not an array/object, we're done.
        moreResults = false;
      }
    } catch (error) {
      console.error(
        `Error fetching wishlist for steamId ${steamId}, page ${page}:`,
        error
      );
      // Stop trying if there's an error.
      moreResults = false;
    }
  }

  return wishlist;
}
