import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'eskimi';
const ENDPOINT = 'https://ssp.eskimi.com/openrtb2/auction?source=client';

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
var bidRequestMap = {};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.placementId && !!bid.params.siteId;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    var impressions = [];

    bidRequests.forEach((bidRequest) => {
      const imp = constructImpression(bidRequest);
      impressions.push(imp);
      bidRequestMap[bidRequest.adUnitCode] = bidRequest;
    });

    const params = {
      id: bidderRequest.auctionId,
      imp: impressions,
      test: config.getConfig('debug') ? 1 : 0,
      ext: {
        prebid: {
          // set ext.prebid.auctiontimestamp with the auction timestamp. Data type is long integer.
          auctiontimestamp: bidRequests[0].auctionStart,
          targeting: {
            // includewinners is always true for openrtb
            includewinners: true,
            // includebidderkeys always false for openrtb
            includebidderkeys: false
          }
        }
      }
    };

    // Add device info
    const referer = bidderRequest.refererInfo ? bidderRequest.refererInfo.referer || null : null
    appendSiteAppDevice(params, referer);

    // Apply gdpr
    if (bidderRequest.gdprConsent) {
      params.regs = {ext: {gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0}};
      params.user = {ext: {consent: bidderRequest.gdprConsent.consentString}};
    }

    return {method: 'POST', url: ENDPOINT, data: JSON.stringify(params), options: {withCredentials: false}}
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidderRequests) {
    serverResponse = serverResponse.body;
    const bids = [];

    if (serverResponse.id && serverResponse.seatbid.length > 0) {
      serverResponse.seatbid.forEach(seatbid => {
        seatbid.bid.forEach(bid => {
          const newbid = newBid(serverResponse, bid);
          bids.push(newbid);
        });
      });
    }
    return bids;
  }
};

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param bid
 * @return aBid
 */

function newBid(serverBid, bid) {
  const aBid = {
    ad: bid.adm,
    cpm: bid.price,
    creativeId: bid.crid,
    currency: serverBid.cur || DEFAULT_CURRENCY,
    width: bid.w,
    height: bid.h,
    netRevenue: DEFAULT_NET_REVENUE,
    requestId: bidRequestMap[bid.impid].bidId,
    ttl: bid.ttl || DEFAULT_BID_TTL
  };
  return aBid;
}

/**
 * Constructs device info
 */
function appendSiteAppDevice(request, pageUrl) {
  if (!request) return;

  request.site = {};
  if (utils.isPlainObject(config.getConfig('site'))) {
    request.site = config.getConfig('site');
  }
  // set site.page if not already defined
  if (!request.site.page) {
    request.site.page = pageUrl;
    request.site.publisher = {id: 1}; // Account id at Eskimi prebid server
  }

  if (typeof config.getConfig('device') === 'object') {
    request.device = config.getConfig('device');
  }
  if (!request.device) {
    request.device = {};
  }
  if (!request.device.w) {
    request.device.w = window.innerWidth;
  }
  if (!request.device.h) {
    request.device.h = window.innerHeight;
  }
}

function constructImpression(bidRequest) {
  const imp = {
    id: bidRequest.adUnitCode,
    banner: {
      format: bidRequest.sizes.map(sizeArr => ({
        w: sizeArr[0],
        h: sizeArr[1]
      }))
    },
    ext: {
      eskimi: {
        placementId: bidRequest.params.placementId,
        siteId: bidRequest.params.siteId,
        at: 2
      }
    }
  };
  return imp;
}

registerBidder(spec);
