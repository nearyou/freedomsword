import Image from 'next/image';
export default function BrandMark() {
  return (
    <Image
      className="brand-mark"
      src="/brand/logo.jpg"
      width={44}
      height={44}
      sizes="44px"
      alt=""
    />
  );
}
