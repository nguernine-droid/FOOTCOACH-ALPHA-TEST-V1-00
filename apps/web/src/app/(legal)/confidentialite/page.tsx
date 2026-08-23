import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, EDITOR, HOST, LEGAL_VERSIONS, RETENTION, legalIsComplete } from "@/lib/legal";
import {
  ContactCard,
  IncompleteNotice,
  LegalPage,
  LegalTable,
  SummaryBox,
  Value,
} from "@/components/public/LegalPage";

const complete = legalIsComplete();

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Ce que TeamNexus enregistre à votre sujet, pourquoi, pendant combien de temps, qui peut le voir, et comment reprendre la main dessus.",
  alternates: { canonical: "/confidentialite" },
  robots: { index: complete, follow: true },
};

const TOC = [
  { id: "responsable", label: "Responsable du traitement" },
  { id: "donnees", label: "Données traitées" },
  { id: "jamais", label: "Ce qui n'est pas collecté" },
  { id: "destinataires", label: "Qui y a accès" },
  { id: "durees", label: "Durées de conservation" },
  { id: "droits", label: "Vos droits" },
  { id: "securite", label: "Sécurité" },
  { id: "cookies", label: "Cookies et stockage local" },
  { id: "notifications", label: "Notifications push" },
  { id: "modifications", label: "Modifications" },
];

export default function Confidentialite() {
  return (
    <LegalPage
      eyebrow="Données personnelles"
      title="Politique de confidentialité"
      lede="Ce que TeamNexus enregistre à votre sujet, pourquoi, pendant combien de temps, qui peut le voir, et comment reprendre la main dessus."
      updated={LEGAL_VERSIONS.privacy.updated}
      version={LEGAL_VERSIONS.privacy.version}
      toc={TOC}
    >
      {!complete && <IncompleteNotice />}

      <SummaryBox title="En résumé">
        <ul>
          <li>
            TeamNexus ne réunit que des <b>coachs adultes</b>{" "}: aucune donnée de joueur, donc aucune donnée de
            mineur.
          </li>
          <li>
            Votre <b>position est arrondie à environ un kilomètre</b>{" "}avant d&apos;être enregistrée, et
            n&apos;est jamais montrée aux autres coachs.
          </li>
          <li>
            Votre <b>téléphone n&apos;est visible que de vos relations</b>, celles à qui vous avez donné votre
            code.
          </li>
          <li>
            <b>Aucun traceur publicitaire, aucune mesure d&apos;audience, aucune revente</b>{" "}de données.
          </li>
          <li>
            Les notifications et la géolocalisation ne démarrent qu&apos;avec <b>votre accord explicite</b>, et
            se coupent à tout moment.
          </li>
        </ul>
      </SummaryBox>

      <h2 id="responsable">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est <b>{EDITOR.name}</b>, dont les coordonnées figurent dans les{" "}
        <Link href="/mentions-legales">mentions légales</Link>. Pour toute question relative à vos données :{" "}
        <Value of={CONTACT.email} label="adresse électronique" />.
      </p>
      <p>
        Aucun délégué à la protection des données n&apos;a été désigné : le service ne procède ni au suivi
        systématique à grande échelle, ni au traitement de données sensibles, qui sont les deux cas rendant
        cette désignation obligatoire.
      </p>

      <h2 id="donnees">2. Les données traitées, et pourquoi</h2>
      <p>
        TeamNexus ne demande que ce dont le service a besoin pour fonctionner : trouver un adversaire,
        organiser la rencontre, en valider le score.
      </p>

      <h3>Votre compte</h3>
      <LegalTable>
        <thead>
          <tr>
            <th scope="col">Données</th>
            <th scope="col">Pourquoi</th>
            <th scope="col">Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Adresse électronique</td>
            <td>Identifiant de connexion, et seul moyen de vous joindre</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Mot de passe</td>
            <td>
              Vous authentifier. Il est <b>haché</b>{" "}(scrypt) : il n&apos;est jamais enregistré ni lisible en
              clair, y compris par nous
            </td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Surnom</td>
            <td>Le nom sous lequel les autres coachs vous voient</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Équipes encadrées</td>
            <td>Nom, catégorie et ville de vos équipes : c&apos;est l&apos;objet des annonces</td>
            <td>Exécution du contrat</td>
          </tr>
        </tbody>
      </LegalTable>

      <h3>Votre profil de coach</h3>
      <LegalTable>
        <thead>
          <tr>
            <th scope="col">Données</th>
            <th scope="col">Pourquoi</th>
            <th scope="col">Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Téléphone <em>(facultatif)</em>
            </td>
            <td>Permettre à vos relations de vous appeler. Visible d&apos;elles seules</td>
            <td>Votre consentement</td>
          </tr>
          <tr>
            <td>
              Photo <em>(facultative)</em>
            </td>
            <td>Vous reconnaître d&apos;un amical à l&apos;autre. JPEG, PNG ou WebP, 2 Mo au plus</td>
            <td>Votre consentement</td>
          </tr>
          <tr>
            <td>Code coach</td>
            <td>Un code personnel, à dicter ou à faire scanner, pour créer une relation</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>
              Visibilité du profil <em>(public ou privé)</em>
            </td>
            <td>
              Décider de ce que voient les coachs de votre catégorie qui ne vous ont pas encore rencontré :
              tout, ou votre seul surnom. Voir <a href="#destinataires">Qui a accès à vos données</a>
            </td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>
              Casquettes <em>(facultatives)</em>
            </td>
            <td>
              Joker (être alerté des SOS de votre secteur en premier) et contributeur (publier des
              informations, signaler un problème). Elles s&apos;affichent auprès des autres coachs
            </td>
            <td>Votre consentement</td>
          </tr>
          <tr>
            <td>
              Numéro de licence <em>(facultatif)</em>
            </td>
            <td>
              L&apos;avoir sous la main. <b>Servi à vous seul</b>{" "}: aucun autre coach ne le voit
            </td>
            <td>Votre consentement</td>
          </tr>
        </tbody>
      </LegalTable>

      <h3>Votre position</h3>
      <LegalTable>
        <thead>
          <tr>
            <th scope="col">Données</th>
            <th scope="col">Pourquoi</th>
            <th scope="col">Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Coordonnées arrondies</td>
            <td>
              Placer les annonces sur le radar à leur vraie distance et dans leur vraie direction.{" "}
              <b>Arrondies au centième de degré, soit environ un kilomètre</b>, à la réception <em>et</em>{" "}à
              l&apos;enregistrement : la position exacte n&apos;existe nulle part dans nos bases
            </td>
            <td>
              Votre consentement (géolocalisation de l&apos;appareil) ou exécution du contrat (adresse que vous
              saisissez)
            </td>
          </tr>
          <tr>
            <td>Libellé de la position</td>
            <td>Vous montrer ce que le service a compris (« Bron, Rhône »)</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Rayon du radar</td>
            <td>Filtrer les annonces, et décider qui prévenir d&apos;une nouvelle annonce</td>
            <td>Exécution du contrat</td>
          </tr>
        </tbody>
      </LegalTable>
      <p>
        La conversion d&apos;une adresse en coordonnées, et l&apos;inverse, passent par l&apos;{" "}
        <b>API Adresse de l&apos;État</b> (adresse.data.gouv.fr). <b>L&apos;appel part de nos serveurs</b>,
        jamais de votre navigateur : ce service reçoit l&apos;adresse ou les coordonnées concernées, jamais
        votre identité ni votre adresse IP.
      </p>

      <h3>Votre activité dans l&apos;application</h3>
      <ul>
        <li>
          Vos <b>annonces</b>{" "}: date, heure, lieu du match, catégorie, message.
        </li>
        <li>
          Vos <b>propositions</b> et les réponses reçues, les <b>matchs</b> qui en découlent, les <b>scores</b>{" "}
          saisis et validés.
        </li>
        <li>
          Les <b>tournois</b>{" "}que vous organisez ou rejoignez, leur affiche s&apos;il y en a une, et les
          inscriptions des équipes.
        </li>
        <li>
          Les <b>désistements</b>{" "}et leur motif (blessure, météo, terrain, personnel), pour que l&apos;autre
          coach sache à quoi s&apos;en tenir.
        </li>
        <li>
          Vos <b>relations</b>{" "}: la liste des coachs que vous avez ajoutés, et qui vous ont ajouté.
        </li>
        <li>
          Vos <b>messages</b>{" "}avec les autres coachs. Un fil s&apos;ouvre quand une proposition est acceptée ;
          son contenu n&apos;est lu que par vous deux, et par personne d&apos;autre en dehors d&apos;une
          réquisition régulière.
        </li>
        <li>
          Les <b>rencontres validées</b> par scan de QR code au stade, et les <b>points</b>{" "}qui en découlent —
          ils forment votre palier, visible des autres coachs.
        </li>
        <li>
          Vos <b>équipes</b> : nom, ville, catégorie, genre, niveau, stade et <b>écusson</b>{" "}si vous en envoyez
          un. Le club que vous déclarez (nom, ville, stade) est visible des autres coachs, qui peuvent s&apos;y
          rattacher.
        </li>
        <li>
          Vos <b>publications</b> et vos <b>signalements</b>, si vous portez la casquette contributeur. Un
          signalement ouvre une discussion avec l&apos;équipe TeamNexus, qui lit ce que vous y écrivez.
        </li>
      </ul>
      <p>Base légale : exécution du contrat.</p>

      <h3>Sécurité et bon fonctionnement</h3>
      <ul>
        <li>
          <b>Jetons de connexion</b> : le jeton qui prolonge votre session est enregistré <b>haché</b>, et
          remplacé à chaque usage.
        </li>
        <li>
          <b>Journal des connexions réussies</b>{" "}(date et rôle) : il alimente des statistiques d&apos;usage
          agrégées et permet de repérer une activité anormale.
        </li>
        <li>
          <b>Demandes de mot de passe oublié</b>{" "}: dans cette version, aucun courriel n&apos;est envoyé
          automatiquement — la demande est traitée par l&apos;administrateur, qui vous transmet un mot de passe
          temporaire.
        </li>
      </ul>
      <p>Base légale : intérêt légitime (sécurité du service et amélioration du produit).</p>

      <h2 id="jamais">3. Ce que TeamNexus ne collecte pas</h2>
      <ul>
        <li>
          <b>Aucune donnée de joueur, donc aucune donnée de mineur.</b>{" "}L&apos;application n&apos;a ni comptes
          joueurs ni comptes parents : pas d&apos;effectif, pas de présences, pas de fiches sportives.
        </li>
        <li>
          <b>Aucun traceur publicitaire</b>, aucune régie, aucun profilage, aucune décision automatisée.
        </li>
        <li>
          <b>Aucune mesure d&apos;audience</b>, ni sur ce site ni dans l&apos;application.
        </li>
        <li>
          <b>Aucune position exacte</b>{" "}: l&apos;arrondi est appliqué avant l&apos;enregistrement, un client
          modifié ne peut pas imposer une précision supérieure.
        </li>
        <li>
          <b>Aucun accès à vos contacts</b>, à votre agenda ou à vos photos : la photo de profil et le scan de
          QR code passent par les sélecteurs du système, sur votre action.
        </li>
      </ul>

      <h2 id="destinataires">4. Qui a accès à vos données</h2>
      <LegalTable>
        <thead>
          <tr>
            <th scope="col">Destinataire</th>
            <th scope="col">Ce qu&apos;il voit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Les autres coachs</td>
            <td>
              Vos annonces et vos tournois, les équipes qui les portent avec leur écusson, et votre surnom,
              votre photo et votre palier <b>dès lors que vous vous montrez</b>{" "}: en publiant une annonce, en
              proposant un match, en signant une publication, ou en jouant contre eux. <b>Jamais votre
              position</b>, jamais votre téléphone, jamais votre numéro de licence
            </td>
          </tr>
          <tr>
            <td>
              Les coachs de <b>votre catégorie</b>, dans votre secteur
            </td>
            <td>
              Une liste les réunit, et vous y figurez sans les avoir rencontrés. <b>Profil public</b>{" "}: votre
              surnom, votre photo, votre équipe et la distance qui vous sépare — pas votre position, seulement
              une distance. <b>Profil privé</b>{" "}: votre surnom, et rien d&apos;autre. Le réglage est dans{" "}
              <em>Mon profil</em>, il s&apos;applique immédiatement
            </td>
          </tr>
          <tr>
            <td>Vos relations</td>
            <td>
              En plus : votre <b>téléphone</b>, que vous seul décidez de renseigner
            </td>
          </tr>
          <tr>
            <td>Les coachs avec qui vous échangez</td>
            <td>
              Le contenu de vos <b>messages</b>, et ce que vous écrivez dans un fil
            </td>
          </tr>
          <tr>
            <td>L&apos;administrateur du service</td>
            <td>
              Les comptes et leurs statistiques d&apos;usage, pour la gestion et l&apos;assistance
              (réinitialisation d&apos;un mot de passe, désactivation d&apos;un compte). Et, si vous en envoyez,
              vos <b>signalements</b>{" "}et la discussion qu&apos;ils ouvrent
            </td>
          </tr>
          <tr>
            <td>L&apos;hébergeur</td>
            <td>{HOST.name}, qui héberge la base et les fichiers, sans y accéder pour son propre compte</td>
          </tr>
          <tr>
            <td>Le service de notifications</td>
            <td>
              Uniquement si vous les activez : voir la section <a href="#notifications">Notifications push</a>
            </td>
          </tr>
        </tbody>
      </LegalTable>
      <p>
        Vos données ne sont <b>ni vendues, ni louées, ni transmises à des tiers</b>{" "}à des fins commerciales.
        Elles peuvent être communiquées à une autorité judiciaire ou administrative sur réquisition régulière.
      </p>

      <h2 id="durees">5. Combien de temps elles sont conservées</h2>
      <LegalTable>
        <thead>
          <tr>
            <th scope="col">Donnée</th>
            <th scope="col">Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte et profil</td>
            <td>
              Tant que le compte existe, puis effacés à votre demande (voir <a href="#droits">vos droits</a>)
            </td>
          </tr>
          <tr>
            <td>Annonces, matchs et scores</td>
            <td>{RETENTION.history}</td>
          </tr>
          <tr>
            <td>Jetons de session</td>
            <td>Sept jours au plus, et révoqués dès qu&apos;ils sont utilisés ou que vous vous déconnectez</td>
          </tr>
          <tr>
            <td>Abonnements aux notifications</td>
            <td>
              Supprimés dès que vous les désactivez, ou dès que votre navigateur signale que
              l&apos;abonnement n&apos;est plus valable
            </td>
          </tr>
          <tr>
            <td>Journal des connexions</td>
            <td>{RETENTION.loginLog}</td>
          </tr>
          <tr>
            <td>Photo de profil</td>
            <td>Remplacée à chaque envoi (l&apos;ancienne est effacée), supprimée avec le compte</td>
          </tr>
          <tr>
            <td>Écusson d&apos;équipe, affiche de tournoi</td>
            <td>
              Remplacés à chaque envoi (l&apos;ancien fichier est effacé) ; retirables à tout moment depuis
              l&apos;application
            </td>
          </tr>
          <tr>
            <td>Messages entre coachs</td>
            <td>Conservés tant que les deux comptes existent ; le fil disparaît avec l&apos;un ou l&apos;autre</td>
          </tr>
          <tr>
            <td>Signalements et leur discussion</td>
            <td>Conservés le temps du traitement et du suivi, effacés avec le compte de leur auteur</td>
          </tr>
        </tbody>
      </LegalTable>

      <h2 id="droits">6. Vos droits</h2>
      <p>
        Le règlement européen 2016/679 (RGPD) et la loi Informatique et Libertés vous donnent un droit d&apos;{" "}
        <b>accès</b>, de <b>rectification</b>, d&apos;<b>effacement</b>, de <b>limitation</b>, d&apos;{" "}
        <b>opposition</b> et de <b>portabilité</b>{" "}sur vos données, ainsi que le droit de définir des
        directives sur leur sort après votre décès.
      </p>
      <h3>Ce que vous pouvez faire seul, dans l&apos;application</h3>
      <ul>
        <li>
          Modifier votre surnom, votre téléphone et votre photo dans <b>Mon profil</b>.
        </li>
        <li>
          Passer votre profil en <b>privé</b>{" "}: les coachs de votre catégorie qui ne vous ont pas rencontré ne
          voient plus que votre surnom. L&apos;effet est immédiat.
        </li>
        <li>Retirer l&apos;écusson d&apos;une de vos équipes, ou le remplacer.</li>
        <li>Effacer votre position enregistrée, ou en changer la source.</li>
        <li>Couper les notifications, en bloc ou type par type.</li>
        <li>Retirer une relation : le lien disparaît des deux côtés.</li>
        <li>
          Rendre une casquette : vous cessez d&apos;être alerté des SOS en premier, ou de pouvoir publier.
        </li>
      </ul>
      <h3>Ce qui passe par nous</h3>
      <p>
        La <b>suppression du compte</b>{" "}n&apos;est pas encore proposée depuis l&apos;application. Écrivez à{" "}
        <Value of={CONTACT.email} label="adresse électronique" /> : le compte et les données associées sont
        supprimés <b>dans le mois</b>{" "}qui suit la demande. Il en va de même pour une demande d&apos;accès ou de
        portabilité.
      </p>
      <p>
        Si la réponse ne vous satisfait pas, vous pouvez saisir la <b>CNIL</b>{" "}: 3 place de Fontenoy, TSA
        80715, 75334 Paris Cedex 07, ou{" "}
        <a href="https://www.cnil.fr" rel="noopener">
          cnil.fr
        </a>
        .
      </p>

      <h2 id="securite">7. Sécurité</h2>
      <ul>
        <li>
          Les mots de passe sont <b>hachés</b>{" "}avec scrypt, une fonction dite mémoire-dure, et ne peuvent pas
          être retrouvés. Les empreintes plus anciennes, au format bcrypt, sont réencodées à la première
          connexion réussie.
        </li>
        <li>
          Les échanges passent par <b>HTTPS</b>{" "}; l&apos;appareil photo, les notifications et l&apos;installation
          de l&apos;application l&apos;exigent de toute façon.
        </li>
        <li>
          Le jeton d&apos;accès dure <b>quinze minutes</b>{" "}; celui qui le renouvelle est haché en base et
          remplacé à chaque usage.
        </li>
        <li>
          Le nombre de tentatives de connexion est <b>limité</b>, et la vérification du mot de passe prend le
          même temps pour un compte inconnu — sans quoi l&apos;écart de réponse suffirait à dresser la liste des
          comptes existants.
        </li>
        <li>
          Les photos de profil sont servies avec une politique qui <b>interdit l&apos;exécution</b>{" "}de tout
          contenu.
        </li>
        <li>
          La validation d&apos;un score exige le coach adverse <b>et</b>{" "}le jeton contenu dans le QR code, jeton
          que l&apos;API ne lui transmet jamais : il faut avoir vu l&apos;écran.
        </li>
      </ul>
      <p>
        Aucun système n&apos;est infaillible. En cas de violation de données susceptible d&apos;engendrer un
        risque pour vos droits, vous en seriez informé, et la CNIL notifiée dans les 72 heures.
      </p>

      <h2 id="cookies">8. Cookies et stockage local</h2>
      <p>
        <b>Ce site ne dépose aucun cookie</b>{" "}et n&apos;appelle aucun service tiers. Il mémorise une seule
        chose, dans le stockage local de votre navigateur : votre choix de thème clair ou sombre. Rien
        n&apos;est envoyé à un serveur, rien ne permet de vous reconnaître.
      </p>
      <p>
        <b>L&apos;application</b>{" "}conserve de la même façon votre session et vos préférences d&apos;affichage
        sur votre appareil. Ces informations sont <b>strictement nécessaires</b>{" "}au fonctionnement du service :
        elles n&apos;exigent pas de consentement préalable, et c&apos;est pourquoi aucun bandeau ne vous est
        imposé.
      </p>

      <h2 id="notifications">9. Notifications push</h2>
      <p>
        Les notifications sont <b>facultatives</b>{" "}et ne démarrent qu&apos;après votre autorisation explicite,
        donnée au navigateur. Quatre événements peuvent les déclencher — nouvelle annonce dans votre périmètre,
        proposition reçue, réponse à votre proposition, score à valider — et chacun se coupe séparément dans{" "}
        <b>Mon profil → Notifications</b>.
      </p>
      <p>
        Techniquement, votre navigateur fournit une <b>adresse d&apos;abonnement</b>{" "}et deux clés de
        chiffrement, que nous enregistrons avec la description de votre navigateur. Le message transite par le{" "}
        <b>service de push de votre navigateur</b>{" "}— Google pour Chrome, Apple pour Safari, Mozilla pour
        Firefox — qui voit l&apos;adresse d&apos;abonnement mais reçoit un contenu <b>chiffré de bout en
        bout</b>. Ces services peuvent être situés <b>hors de l&apos;Union européenne</b>{" "}; c&apos;est une
        conséquence du fonctionnement des notifications web, et c&apos;est la raison pour laquelle elles restent
        facultatives.
      </p>
      <p>
        Couper les notifications, ou retirer l&apos;autorisation dans les réglages du navigateur, supprime
        l&apos;abonnement de nos bases.
      </p>

      <h2 id="modifications">10. Modifications de cette politique</h2>
      <p>
        Cette politique peut évoluer avec le service. La date de dernière mise à jour figure en tête de page.
        Un changement substantiel — une nouvelle catégorie de données, un nouveau destinataire — vous serait
        signalé dans l&apos;application avant d&apos;entrer en vigueur.
      </p>

      <ContactCard title="Une question sur vos données">
        <p>
          Écrivez à <Value of={CONTACT.email} label="adresse électronique" />. Nous répondons dans le mois,
          comme le prévoit le RGPD.
        </p>
      </ContactCard>
    </LegalPage>
  );
}
