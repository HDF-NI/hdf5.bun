export class Attributes {
  #nativeId      = 0;
  #gcpl_id = 0;

  constructor(id) {
    this.#nativeId = id; // The raw native hid_t identifier
  }

  get id() {
    return this.getNativeId(); 
  }

  // ✅ INTERNAL METHOD: Used strictly by your other FFI classes to get the real C pointer
  getNativeId() {
    return this.#nativeId;
  }
  
  // Example of a shared attribute method
  getNumAttrs() {
    throw new Error("Abstract method 'getNumAttrs' must be implemented by subclass.");
  }
}
