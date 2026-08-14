import Link from "next/link";

export const metadata = {
  title: "Credentials and presentations · Knowledgebase · Giga Skills Marketplace",
  description:
    "The exact credential and presentation definitions behind the education showcase: types, claims, formats, trust anchors and revocation.",
};

export default function ShowcaseCredentialsPage() {
  return (
    <>
      <h1>Credentials and presentations</h1>
      <p className="docs-lead">
        These are the exact definitions the showcase runs on. The registry operates an issuer
        service for the credentials it awards and verifier services for the presentations it
        requests; the employer operates its own verifier. Everything is carried as SD-JWT verifiable
        credentials (<code>dc+sd-jwt</code>), signed with keys whose x509 certificates are
        registered on a trust list, so the Wallet shows both organisations as trusted service
        providers.
      </p>

      <h2>Credential: Verifiable Student ID</h2>
      <p>
        Issued by the registry when the school validates a registration. Every claim is mandatory at
        issuance and individually disclosable afterwards, so the holder decides field by field what
        a later verifier sees.
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Credential type (vct)</td>
            <td>
              <code>VerifiableStudentID</code>
            </td>
          </tr>
          <tr>
            <td>Format</td>
            <td>
              <code>dc+sd-jwt</code> (SD-JWT verifiable credential)
            </td>
          </tr>
          <tr>
            <td>Issuance flow</td>
            <td>Pre-authorised code with a one-time transaction code</td>
          </tr>
          <tr>
            <td>Revocation</td>
            <td>
              Status list (<code>status_list</code>)
            </td>
          </tr>
          <tr>
            <td>Validity</td>
            <td>1825 days (5 years)</td>
          </tr>
          <tr>
            <td>Trust anchor</td>
            <td>x509 certificate, registered on the trust list</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Claim</th>
            <th>Type</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>commonName</code>, <code>displayName</code>
            </td>
            <td>string</td>
            <td>The learner&apos;s full name as registered</td>
          </tr>
          <tr>
            <td>
              <code>firstName</code>, <code>familyName</code>
            </td>
            <td>string</td>
            <td>Name parts confirmed by the identity credential</td>
          </tr>
          <tr>
            <td>
              <code>dateOfBirth</code>
            </td>
            <td>string (date)</td>
            <td>From the identity credential</td>
          </tr>
          <tr>
            <td>
              <code>mail</code>
            </td>
            <td>string</td>
            <td>Contact email</td>
          </tr>
          <tr>
            <td>
              <code>id</code>, <code>identifier</code>
            </td>
            <td>string</td>
            <td>Registry record identifiers</td>
          </tr>
          <tr>
            <td>
              <code>eduPersonPrincipalName</code>
            </td>
            <td>string</td>
            <td>
              The learner identifier at the registry, for example{" "}
              <code>ulid-…@nlr.gov.example</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>eduPersonAffiliation[]</code>, <code>eduPersonPrimaryAffiliation</code>,{" "}
              <code>eduPersonScopedAffiliation[]</code>
            </td>
            <td>array of string, string</td>
            <td>
              The role at the institution, for example <code>student</code> and{" "}
              <code>student@riverside.school.example</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>eduPersonAssurance[]</code>
            </td>
            <td>array of string (URI)</td>
            <td>Identity assurance level of the registration</td>
          </tr>
          <tr>
            <td>
              <code>schacHomeOrganization</code>
            </td>
            <td>string</td>
            <td>The institution&apos;s domain</td>
          </tr>
          <tr>
            <td>
              <code>schacPersonalUniqueCode[]</code>, <code>schacPersonalUniqueID</code>
            </td>
            <td>array of string, string</td>
            <td>Sectoral unique codes for the learner</td>
          </tr>
        </tbody>
      </table>

      <h2>Credential: National Diploma</h2>
      <p>
        Issued after the graduation decision and the fee payment, in the same Wallet session as the
        payment presentation. The claim set models the W3C Verifiable Credentials 2.0 and Open
        Badges education fields semantically, carried as an SD-JWT credential for selective
        disclosure.
      </p>
      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Credential type (vct)</td>
            <td>
              <code>urn:education:diploma:1</code>
            </td>
          </tr>
          <tr>
            <td>Format</td>
            <td>
              <code>dc+sd-jwt</code>
            </td>
          </tr>
          <tr>
            <td>Issuance flow</td>
            <td>
              Dynamic credential request: the payment presentation and the issuance complete in one
              Wallet session, with no separate offer
            </td>
          </tr>
          <tr>
            <td>Revocation</td>
            <td>
              Status list (<code>status_list</code>); a revoked diploma fails every later
              verification
            </td>
          </tr>
          <tr>
            <td>Validity</td>
            <td>3650 days (10 years)</td>
          </tr>
          <tr>
            <td>Trust anchor</td>
            <td>x509 certificate, registered on the trust list</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Claim</th>
            <th>Type</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>learnerName</code>
            </td>
            <td>string</td>
            <td>The graduate&apos;s name</td>
          </tr>
          <tr>
            <td>
              <code>qualificationName</code>
            </td>
            <td>string</td>
            <td>For example Upper Secondary Diploma, Natural Sciences</td>
          </tr>
          <tr>
            <td>
              <code>qualificationCode</code>
            </td>
            <td>string</td>
            <td>
              The framework code, for example <code>NQF-4-NATSCI</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>awardingInstitution</code>
            </td>
            <td>string</td>
            <td>The school that decided the graduation</td>
          </tr>
          <tr>
            <td>
              <code>awardDate</code>
            </td>
            <td>string (date)</td>
            <td>Date of the award</td>
          </tr>
          <tr>
            <td>
              <code>programme</code>, <code>result</code>
            </td>
            <td>string</td>
            <td>Programme name and final result</td>
          </tr>
          <tr>
            <td>
              <code>ulid</code>
            </td>
            <td>string</td>
            <td>The learner identifier in the registry</td>
          </tr>
          <tr>
            <td>
              <code>graduationDecisionHash</code>
            </td>
            <td>string (SHA-256 hex)</td>
            <td>
              Hash of the school&apos;s signed graduation decision text, binding the credential to
              the institution&apos;s decision
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Presentation: learner sign-in</h2>
      <p>
        The education portal signs the learner in with a presentation request instead of a password.
        The request is a DCQL query answered over OpenID4VP (<code>vp_token</code>,{" "}
        <code>direct_post</code>), with the verifier identified by the <code>x509_hash</code> client
        identifier scheme.
      </p>
      <table>
        <thead>
          <tr>
            <th>Requested credential</th>
            <th>Fields</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Person identification data
              <br />
              <code>urn:eu.europa.ec.eudi:pid:1</code>
            </td>
            <td>
              <code>given_name</code>, <code>family_name</code>, <code>birthdate</code>,{" "}
              <code>email</code>, <code>address</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The registry stores no raw identity attribute: the learner record is keyed by a pairwise
        pseudonym derived from stable identity claims, and the shared values only prefill the
        registration form transiently.
      </p>

      <h2>Presentation: diploma fee payment</h2>
      <p>
        The fee is confirmed by presenting a payment credential together with signed transaction
        data (the amount, currency, payee and transaction identifier), so the Wallet shows the
        learner exactly what is being authorised. Two definitions exist so the learner can choose
        the instrument; both carry the <code>payment</code> transaction data type.
      </p>
      <table>
        <thead>
          <tr>
            <th>Requested credential</th>
            <th>Fields</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Payment account credential
              <br />
              <code>…/vct-metadata/payment_account</code>
            </td>
            <td>
              <code>iban</code>, <code>bic</code>, <code>currency</code>
            </td>
          </tr>
          <tr>
            <td>
              Payment card credential
              <br />
              <code>…/vct-metadata/card</code>
            </td>
            <td>
              <code>pan_last_four</code>, <code>scheme</code>, <code>scheme_logo</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The transaction data names the payee (the Ministry, with its registry identifier{" "}
        <code>ESR-MOE-0001</code>), the EUR 50 amount, and the execution date. The verified
        presentation is the payment evidence; the funds movement itself is a sandbox ledger entry.
      </p>

      <h2>Presentation: employer qualification check</h2>
      <p>
        The employer&apos;s verifier requests two credentials in one presentation, and only the
        listed fields. Date of birth, address, grades, and the learner identifier are not requested,
        and the Wallet never sends them.
      </p>
      <table>
        <thead>
          <tr>
            <th>Requested credential</th>
            <th>Fields</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Person identification data
              <br />
              <code>urn:eu.europa.ec.eudi:pid:1</code>
            </td>
            <td>
              <code>given_name</code>, <code>family_name</code>, <code>email</code>
            </td>
          </tr>
          <tr>
            <td>
              National Diploma
              <br />
              <code>urn:education:diploma:1</code>
            </td>
            <td>
              <code>learnerName</code>, <code>qualificationName</code>,{" "}
              <code>qualificationCode</code>, <code>awardingInstitution</code>,{" "}
              <code>awardDate</code>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        The verification result the employer sees covers four proofs: the signature and integrity of
        each credential, issuer trust against the trust list, and the live revocation status from
        the status list. After the registry revokes a diploma, the same request is rejected.
      </p>

      <h2>Trust configuration</h2>
      <p>
        Each definition signs or requests with its own key, and each key&apos;s x509 certificate is
        registered individually on the trust list: separate certificates for the Student ID issuer,
        the diploma issuer, the sign-in verifier, the payment verifier, and the employer&apos;s
        verifier. That is why the Wallet labels both organisations Trusted Service Provider on every
        screen of the <Link href="/knowledgebase/showcase">walkthrough</Link>.
      </p>
    </>
  );
}
