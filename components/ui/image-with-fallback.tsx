'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string
  fallbackSrc?: string
}

export function ImageWithFallback({
  src,
  fallbackSrc = '/placeholder-artist.svg',
  alt,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => {
        setImgSrc(fallbackSrc)
      }}
    />
  )
}
