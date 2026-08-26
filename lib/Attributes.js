class Attributes {
  constructor(id) {
    this.id = id; // The raw native hid_t identifier
  }

  // Example of a shared attribute method
  getNumAttrs() {
    throw new Error("Abstract method 'getNumAttrs' must be implemented by subclass.");
  }
}