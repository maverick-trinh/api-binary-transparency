import { UrlFetcher } from "../lib/url_fetcher";
import { ResourceFetcher } from "../lib/resource";
import { RPCSelector } from "../lib/rpc_selector";
import { SuiNSResolver } from "../lib/suins";
import { WalrusSitesRouter } from "../lib/routing";
import {
  SUI_NETWORK,
  RPC_URL_LIST,
  AGGREGATOR_URL,
  SITE_PACKAGE,
} from "../config/environment";

/**
 * A factory class for creating page fetchers.
 * Page fetchers can be either premium or standard.
 * Premium fetchers use premium RPC nodes that can serve content faster and more reliably,
 * while standard fetchers use standard RPC nodes.
 */

class UrlFetcherFactory {
  private static readonly standardRpcSelector = new RPCSelector(
    [RPC_URL_LIST],
    SUI_NETWORK as any
  );

  public static standardUrlFetcher(): UrlFetcher {
    return new UrlFetcher(
      new ResourceFetcher(this.standardRpcSelector, SITE_PACKAGE),
      new SuiNSResolver(this.standardRpcSelector),
      new WalrusSitesRouter(this.standardRpcSelector),
      AGGREGATOR_URL,
      true //TODO: Need using library z
    );
  }
}

export const standardUrlFetcher = UrlFetcherFactory.standardUrlFetcher();
