import ip from 'ip';

export const getLocalAddress = () => {
  return ip.address("public", "ipv4");
}