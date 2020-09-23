# Overview

Module Name: ESKIMI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: sekandar@eskimi.com

# Description

An adapter to get a bid from Eskimi DSP.

# Test Parameters
```javascript
    var adUnits = [{
       code: 'div-gpt-ad-1460505748561-0',
       mediaTypes: {
           banner: {
               sizes: [[300, 250], [300, 600]]
           }
       },
       
       bids: [{
           bidder: 'eskimi',
           params: {
               placementId: 13144370,
               siteId: 1,
               at: 2
           }
       }]

   }];
```

Where:

* placementId - Placement ID of the ad unit
* siteId - Uniq id of the site
* at - 1 for first price and 2 for second price

