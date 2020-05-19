export function safeDeallocation(object, type, type_cb, nontype_cb) {
  if (object instanceof type) {
    type_cb(object);
  } else {
    nontype_cb(object);
  }
}
