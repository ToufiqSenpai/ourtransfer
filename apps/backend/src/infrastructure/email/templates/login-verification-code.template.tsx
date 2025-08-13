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
  Hr,
  CodeInline,
} from "@react-email/components"

export interface LoginVerificationCodeTemplateProps {
  code: string
  name?: string
}

function LoginVerificationCodeTemplate(props: LoginVerificationCodeTemplateProps): React.JSX.Element {
  const { code, name } = props

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
          <Preview>Your OurTransfer verification code: {code}</Preview>
          <Container className="text-center text-black font-[Roboto]">
            <Heading className="text-center" style={{ fontFamily: "'times-new-roman', serif" }}>
              OurTransfer
            </Heading>
            <Section>
              <Text className="text-xl font-semibold">
                {name ? `Hi ${name}, here's` : "Here's"} your verification code
              </Text>
              <Text>
                We received a request to sign in to your OurTransfer account. Use the verification code below to
                complete your login:
              </Text>
              
              {/* Verification Code Display */}
              <Section className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-6">
                <Text className="text-sm text-gray-600 mb-2">Your verification code:</Text>
                <CodeInline 
                  className="bg-white border-2 border-indigo-600 text-indigo-600 text-3xl font-bold px-6 py-4 rounded-lg tracking-widest"
                  style={{ 
                    fontFamily: "monospace",
                    fontSize: "32px",
                    fontWeight: "bold",
                    letterSpacing: "8px",
                    display: "inline-block",
                    margin: "0 auto"
                  }}
                >
                  {code}
                </CodeInline>
                <Text className="text-sm text-gray-500 mt-3">
                  This code will expire in 5 minutes for security reasons.
                </Text>
              </Section>

              <Text>
                Simply enter this code in the login form to access your account. If you didn't request this code,
                please ignore this email or contact our support team if you have concerns.
              </Text>

              <Section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
                <Text className="text-sm text-yellow-800 mb-1">
                  <strong>Security tip:</strong>
                </Text>
                <Text className="text-sm text-yellow-700">
                  Never share this verification code with anyone. OurTransfer will never ask for your verification
                  code via phone, email, or text message.
                </Text>
              </Section>
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

export default LoginVerificationCodeTemplate
