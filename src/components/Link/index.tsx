import React, { useCallback } from 'react'
import { URL } from 'iso-url'
import { useLocation } from '@reach/router'
import GatsbyLink from 'gatsby-link'
import { getRedirect } from '../../utils/shared/redirects'
import { scrollIntoLayout, getScrollNode } from '../../utils/front/scroll'

export type ILinkProps = {
  children: React.ReactNode
  className?: string
  href: string
  target?: undefined | '_blank'
  state?: unknown
} & React.AnchorHTMLAttributes<HTMLAnchorElement>

const PROTOCOL_REGEXP = /^https?:\/\//
const isRelative = (url: string): boolean => !PROTOCOL_REGEXP.test(url)
const isMailto = (url: string): boolean => url.startsWith('mailto:')

const ResultLinkComponent: React.FC<ILinkProps> = ({
  href,
  children,
  rel,
  ...restProps
}) => {
  // Handle all situations where a basic `a` must be used over Gatsby Link
  const hrefIsRelative = isRelative(href)
  const hrefIsMailto = isMailto(href)
  const hrefHasTarget = restProps.target
  // Fragments within the page should be `a`, but links to other pages
  // that have anchors should be okay.
  const hrefIsRelativeFragment = href.startsWith('#')

  if (
    !hrefIsRelative ||
    hrefIsMailto ||
    hrefHasTarget ||
    hrefIsRelativeFragment
  ) {
    /*
       Change external links without an explicit rel to have 'noopener
       noreferrer', but leave explicitly defined rels alone.
    */
    if (!hrefIsRelative && typeof rel !== 'string') {
      rel = 'noopener noreferrer'
    }

    return (
      <a href={href} rel={rel} {...restProps}>
        {children}
      </a>
    )
  }

  return (
    <GatsbyLink to={href} {...restProps}>
      {children}
    </GatsbyLink>
  )
}

const scrollToHash = (hash: string): void => {
  if (hash) {
    scrollIntoLayout(document.querySelector(hash), { waitImages: true })
  }
}

const Link: React.FC<ILinkProps> = ({ href, ...restProps }) => {
  const currentLocation = useLocation()
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (restProps.onClick) {
        restProps.onClick(e)
      }

      const location = new URL(href)

      // Do not navigate to the same page. Handle hash scrolling manually
      if (
        currentLocation.host === location.host &&
        currentLocation.pathname === location.pathname
      ) {
        e.preventDefault()

        // We can't navigate by direct usage of @reach/router#navigate because
        // gatsby-react-router-scroll will package intercept scroll in this
        // case and we will see undesired jump
        window.history.pushState(null, '', href)

        if (location.hash) {
          scrollToHash(location.hash)
        } else {
          getScrollNode().scrollTop = 0
        }
      }
    },
    [restProps.onClick, currentLocation]
  )

  const location = new URL(href)

  if (location.host === currentLocation.host) {
    // Replace link href with redirect if it exists
    const [, redirectUrl] = getRedirect(location.host, location.pathname)

    if (redirectUrl) {
      href = isRelative(redirectUrl)
        ? redirectUrl + currentLocation.search
        : redirectUrl
    }
  }

  return <ResultLinkComponent href={href} {...restProps} onClick={onClick} />
}

export default Link
