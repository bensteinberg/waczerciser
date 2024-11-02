import { SWReplay, SWCollections, Collection } from '@webrecorder/wabac/swlib'

// Declare the service worker self type
declare global {
    interface ServiceWorkerGlobalScope {
        sw: SWReplay;
    }
}

// Tell TypeScript that 'self' is a ServiceWorkerGlobalScope
declare const self: ServiceWorkerGlobalScope;

// Custom Collection subclass
class CustomCollection extends Collection {
  // Override any Collection methods here
  async handleRequest(request, event) {
    console.log("Custom collection handling request:", request.url);
    const res = await super.handleRequest(request, event);
    if (res.status === 404) {
      console.log("Custom collection handling 404:", request.url);
    }
    return res;
  }
}

class CustomCollections extends SWCollections {
    _createCollection(opts: Record<string, any>): Collection {
      return new CustomCollection(opts, this.prefixes, this.defaultConfig);
    }
  }

// Initialize SWReplay with custom Collection class
self.sw = new SWReplay({CollectionsClass: CustomCollections});

console.log("custom sw init");
