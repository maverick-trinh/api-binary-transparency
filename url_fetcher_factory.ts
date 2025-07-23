// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { UrlFetcher } from "./lib/url_fetcher";
import { ResourceFetcher } from "./lib/resource";
import { RPCSelector } from "./lib/rpc_selector";
import { SuiNSResolver } from "./lib/suins";
import { WalrusSitesRouter } from "./lib/routing";

/**
* A factory class for creating page fetchers.
* Page fetchers can be either premium or standard.
* Premium fetchers use premium RPC nodes that can serve content faster and more reliably,
* while standard fetchers use standard RPC nodes.
*/
const NETWORK = "mainnet";
const RPC_URL_LIST = ["https://fullnode.mainnet.sui.io"];
const AGGREGATOR_URL="https://aggregator.walrus-mainnet.walrus.space";
const SITE_PACKAGE="0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27";

class UrlFetcherFactory {
  // TODO: Will check premiumUrl later
  // private static readonly premiumRpcSelector = new RPCSelector(
  //     config.premiumRpcUrlList, config.suinsClientNetwork
  // );
  private static readonly standardRpcSelector = new RPCSelector(
      RPC_URL_LIST, NETWORK
  );
  // public static premiumUrlFetcher(): UrlFetcher {
  //     return new UrlFetcher(
  //         new ResourceFetcher(this.premiumRpcSelector, config.sitePackage),
  //         new SuiNSResolver(this.premiumRpcSelector),
  //         new WalrusSitesRouter(this.premiumRpcSelector),
  //         config.aggregatorUrl,
  //         config.b36DomainResolutionSupport
  //     );
  // }

  public static standardUrlFetcher(): UrlFetcher {
      return new UrlFetcher(
          new ResourceFetcher(this.standardRpcSelector, SITE_PACKAGE),
          new SuiNSResolver(this.standardRpcSelector),
          new WalrusSitesRouter(this.standardRpcSelector),
          AGGREGATOR_URL,
          true, //TODO: Need using library z
      );
  }
}

export const standardUrlFetcher = UrlFetcherFactory.standardUrlFetcher();
// export const premiumUrlFetcher = UrlFetcherFactory.premiumUrlFetcher();
