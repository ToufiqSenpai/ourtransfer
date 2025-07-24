import React from "react"
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  Font,
  Button,
  Hr,
} from "@react-email/components"

export interface PasswordResetTemplateProps {
  setPasswordUrl: string
}

function PasswordResetTemplate(props: PasswordResetTemplateProps): React.JSX.Element {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Roboto"
          fallbackFontFamily="Verdana"
          webFont={{
            url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Body>
        <Tailwind>
          <Preview>Reset your OurTransfer password</Preview>
          <Container className="text-center text-black font-[Roboto]">
            <Heading className="text-center" style={{ fontFamily: "'times-new-roman', serif" }}>
              OurTransfer
            </Heading>
            <Section>
              <Text className="text-xl font-semibold">You're almost there, just set a new password</Text>
              <Text>
                We received a request to reset your OurTransfer password. No worries, it happens! Click the button below
                to set up a new one.
              </Text>
              <Button
                className="bg-indigo-600 h-12 cursor-pointer text-white w-full max-w-xs mx-auto rounded-lg"
                style={{ lineHeight: "48px" }}
                href={props.setPasswordUrl}
              >
                Reset Password
              </Button>
              <Text>
                If you didn't ask to reset your password, you don't need to do anything. You can safely ignore this
                email, and your account will remain secure.
              </Text>
            </Section>
            <Hr />
            <Section className="mt-3 text-center text-sm text-gray-500 bg-gray-100">
              <Text className="text-xs my-2">1234 Tanah Sareal Rd, Suite 500</Text>
              <Text className="text-xs my-2">Ngawi, East Java, 6969, Indonesia</Text>
              <Text className="text-xs my-2">Phone: +62 21 555 0123</Text>
              <Text className="mt-2 text-xs">
                If you have any questions, please{" "}
                <a href="mailto:support@ourtransfer.com" className="text-indigo-600 underline">
                  contact us
                </a>
                .
              </Text>
              <Text className="mt-4 text-xs text-gray-400">
                Copyright © {new Date().getFullYear()} OurTransfer Inc. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Tailwind>
      </Body>
    </Html>
  )
}

export default PasswordResetTemplate
