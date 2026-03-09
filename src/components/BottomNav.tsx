import { Box, Flex, Text } from '@chakra-ui/react'
import { Link as RouterLink, useLocation } from 'react-router-dom'

type IconProps = { size?: number }

function HomeIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function WardrobeIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 19H3.5a.5.5 0 0 1-.38-.82L12 8l8.88 10.18a.5.5 0 0 1-.38.82z" />
      <path d="M12 8V5.5a2.5 2.5 0 0 0-5 0" />
    </svg>
  )
}

function FeedbackIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: HomeIcon },
  { to: '/wardrobe', label: 'Wardrobe', Icon: WardrobeIcon },
  { to: '/feedback', label: 'Feedback', Icon: FeedbackIcon },
]

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <Box
      hideFrom="md"
      as="nav"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      borderTopWidth="1px"
      bg="bg"
      zIndex="sticky"
      pb="env(safe-area-inset-bottom)"
    >
      <Flex>
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
          return (
            <RouterLink
              key={to}
              to={to}
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <Flex
                direction="column"
                align="center"
                justify="center"
                pt="2px"
                pb={2}
                minH="52px"
                gap="2px"
                color={isActive ? 'blue.500' : 'fg.muted'}
                borderTopWidth="2px"
                borderTopColor={isActive ? 'blue.500' : 'transparent'}
                transition="color 0.15s, border-color 0.15s"
                _hover={{ color: isActive ? 'blue.500' : 'fg' }}
              >
                <Icon size={22} />
                <Text fontSize="10px" fontWeight={isActive ? 'semibold' : 'normal'} lineHeight="1">
                  {label}
                </Text>
              </Flex>
            </RouterLink>
          )
        })}
      </Flex>
    </Box>
  )
}
