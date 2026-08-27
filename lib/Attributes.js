class Attributes {
  #id      = 0;
  #gcpl_id = 0;

  constructor(id) {
    this.#id = id; // The raw native hid_t identifier
  }

  get id() {
    return this.#id < 0n ? -1 : 1; 
  }

  // ✅ INTERNAL METHOD: Used strictly by your other FFI classes to get the real C pointer
  getNativeId() {
    return this.#id;
  }
  
  // Example of a shared attribute method
  getNumAttrs() {
    throw new Error("Abstract method 'getNumAttrs' must be implemented by subclass.");
  }
}

export { Attributes };